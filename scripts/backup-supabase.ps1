param(
  [string]$OutputDir = $env:BACKUP_OUTPUT_DIR,
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
  [string]$DatabaseHost = "aws-0-us-east-1.pooler.supabase.com",
  [string]$DatabaseName = "postgres",
  [string]$DatabaseUser = "postgres.onqbnogccjfgihmmxrid",
  [int]$DatabasePort = 5432,
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

function Get-DefaultConfigPath {
  $configDir = Join-Path $env:APPDATA "FinancPlantoes"
  Join-Path $configDir "backup-config.json"
}

function New-DatabaseUrl {
  param(
    [string]$HostName,
    [int]$Port,
    [string]$Name,
    [string]$User,
    [securestring]$Password
  )

  $credential = [System.Net.NetworkCredential]::new("", $Password)
  $escapedPassword = [uri]::EscapeDataString($credential.Password)
  "postgresql://$($User):$escapedPassword@$($HostName):$Port/$($Name)"
}

function Read-BackupConfig {
  $configPath = if ($env:FINANCPLANTOES_BACKUP_CONFIG) {
    $env:FINANCPLANTOES_BACKUP_CONFIG
  } else {
    Get-DefaultConfigPath
  }

  if (-not (Test-Path $configPath)) {
    return $null
  }

  Get-Content $configPath -Raw | ConvertFrom-Json
}

$backupConfig = Read-BackupConfig

if ($backupConfig) {
  if ([string]::IsNullOrWhiteSpace($OutputDir) -and $backupConfig.output_dir) {
    $OutputDir = $backupConfig.output_dir
  }

  if (-not $PSBoundParameters.ContainsKey("RetentionDays") -and $backupConfig.retention_days) {
    $RetentionDays = [int]$backupConfig.retention_days
  }

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl) -and $backupConfig.encrypted_password) {
    $securePassword = $backupConfig.encrypted_password | ConvertTo-SecureString
    $DatabaseHost = $backupConfig.database_host
    $DatabaseName = $backupConfig.database_name
    $DatabaseUser = $backupConfig.database_user
    $DatabasePort = [int]$backupConfig.database_port
    $DatabaseUrl = New-DatabaseUrl -HostName $DatabaseHost -Port $DatabasePort -Name $DatabaseName -User $DatabaseUser -Password $securePassword
    Remove-Variable securePassword -ErrorAction SilentlyContinue
  }
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  $securePassword = Read-Host "Digite a senha do banco Supabase" -AsSecureString
  $DatabaseUrl = New-DatabaseUrl -HostName $DatabaseHost -Port $DatabasePort -Name $DatabaseName -User $DatabaseUser -Password $securePassword
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $googleDriveDir = "G:\Meu Drive\Backups-FinancPlantoes"
  if (Test-Path "G:\Meu Drive") {
    $OutputDir = $googleDriveDir
  } else {
    $OutputDir = "backups"
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "financplantoes-backup-$timestamp"
$workDir = Join-Path $OutputDir $backupName
$schemaFile = Join-Path $workDir "schema.sql"
$dataFile = Join-Path $workDir "data.sql"
$manifestFile = Join-Path $workDir "manifest.json"
$zipFile = Join-Path $OutputDir "$backupName.zip"

New-Item -ItemType Directory -Force -Path $workDir | Out-Null

function Get-PgDumpCommand {
  $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if ($pgDump) {
    return $pgDump.Source
  }

  $knownPgDump = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like "*\bin\pg_dump.exe" } |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if ($knownPgDump) {
    return $knownPgDump.FullName
  }

  return $null
}

function Invoke-Dump {
  param(
    [ValidateSet("schema", "data")]
    [string]$Kind,
    [string]$ExpectedFile
  )

  $pgDumpCommand = Get-PgDumpCommand
  if ($pgDumpCommand) {
    $pgDumpArguments = @(
      $DatabaseUrl,
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--file", $ExpectedFile
    )

    if ($Kind -eq "schema") {
      $pgDumpArguments += "--schema-only"
    } else {
      $pgDumpArguments += "--data-only"
      $pgDumpArguments += "--use-set-session-authorization"
    }

    & $pgDumpCommand @pgDumpArguments
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao gerar dump com pg_dump. Codigo de saida: $LASTEXITCODE"
    }

    if (-not (Test-Path $ExpectedFile) -or (Get-Item $ExpectedFile).Length -le 0) {
      throw "Dump nao foi gerado corretamente ou esta vazio: $ExpectedFile"
    }

    return
  }

  if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and -not (Get-Command podman -ErrorAction SilentlyContinue)) {
    throw "pg_dump nao encontrado e Docker Desktop/Podman tambem nao esta disponivel. Instale o cliente do PostgreSQL ou habilite o Docker."
  }

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
      throw "Docker Desktop encontrado, mas nao esta rodando. Abra o Docker Desktop, aguarde ficar ativo e rode o backup novamente."
    }
  }

  $arguments = if ($Kind -eq "schema") {
    @("--db-url", $DatabaseUrl, "-f", $ExpectedFile)
  } else {
    @("--db-url", $DatabaseUrl, "-f", $ExpectedFile, "--use-copy", "--data-only")
  }

  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase db dump @arguments
  } elseif (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
    & npx.cmd supabase db dump @arguments
  } else {
    throw "Supabase CLI nao encontrado. Instale a CLI ou use npx.cmd supabase."
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao gerar dump. Codigo de saida: $LASTEXITCODE"
  }

  if (-not (Test-Path $ExpectedFile) -or (Get-Item $ExpectedFile).Length -le 0) {
    throw "Dump nao foi gerado corretamente ou esta vazio: $ExpectedFile"
  }
}

function Get-FileManifestEntry {
  param([string]$Path)

  $item = Get-Item $Path
  $hash = Get-FileHash -Algorithm SHA256 -Path $Path

  [ordered]@{
    name = $item.Name
    size_bytes = $item.Length
    sha256 = $hash.Hash
  }
}

try {
  Invoke-Dump -Kind "schema" -ExpectedFile $schemaFile
  Invoke-Dump -Kind "data" -ExpectedFile $dataFile

  $manifest = [ordered]@{
    app = "FinancPlantoes"
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    output_dir = (Resolve-Path $OutputDir).Path
    retention_days = $RetentionDays
    files = @(
      (Get-FileManifestEntry $schemaFile),
      (Get-FileManifestEntry $dataFile)
    )
  }

  $manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestFile -Encoding UTF8
  Compress-Archive -Path (Join-Path $workDir "*") -DestinationPath $zipFile -Force

  if (-not (Test-Path $zipFile) -or (Get-Item $zipFile).Length -le 0) {
    throw "Arquivo ZIP nao foi gerado corretamente ou esta vazio: $zipFile"
  }
} catch {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $workDir
  Remove-Item -Force -ErrorAction SilentlyContinue $zipFile
  throw
}

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $workDir

if ($RetentionDays -gt 0) {
  $limit = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $OutputDir -Filter "financplantoes-backup-*.zip" -File |
    Where-Object { $_.LastWriteTime -lt $limit } |
    Remove-Item -Force
}

Write-Output "Backup gerado:"
Write-Output "  $zipFile"
Write-Output ""
Write-Output "Destino:"
Write-Output "  $OutputDir"
Write-Output ""
Write-Output "Se a pasta estiver no Google Drive, aguarde a sincronizacao concluir."
