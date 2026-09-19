param(
  [string]$OutputDir = "backups",
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "Defina SUPABASE_DB_URL no ambiente antes de rodar o backup. Nao coloque essa URL no Git."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$schemaFile = Join-Path $OutputDir "schema-$timestamp.sql"
$dataFile = Join-Path $OutputDir "data-$timestamp.sql"

function Invoke-Dump {
  param(
    [string[]]$Arguments,
    [string]$ExpectedFile
  )

  if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and -not (Get-Command podman -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop ou Podman nao encontrado no PATH. O Supabase CLI usa Docker/Podman para executar o dump."
  }

  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase db dump @Arguments
  } elseif (Get-Command npx.cmd -ErrorAction SilentlyContinue) {
    & npx.cmd supabase db dump @Arguments
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

try {
  Invoke-Dump @("--db-url", $DatabaseUrl, "-f", $schemaFile) -ExpectedFile $schemaFile
  Invoke-Dump @("--db-url", $DatabaseUrl, "-f", $dataFile, "--use-copy", "--data-only") -ExpectedFile $dataFile
} catch {
  Remove-Item -Force -ErrorAction SilentlyContinue $schemaFile, $dataFile
  throw
}

Write-Output "Backup gerado:"
Write-Output "  $schemaFile"
Write-Output "  $dataFile"
Write-Output ""
Write-Output "Copie estes arquivos para um local externo seguro, como Google Drive, OneDrive ou HD externo."
