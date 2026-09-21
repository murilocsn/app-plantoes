param(
  [string]$DatabaseHost = "aws-0-us-east-1.pooler.supabase.com",
  [int]$DatabasePort = 5432,
  [string]$DatabaseName = "postgres",
  [string]$DatabaseUser = "postgres.onqbnogccjfgihmmxrid",
  [string]$OutputDir = "G:\Meu Drive\Backups-FinancPlantoes",
  [int]$RetentionDays = 14,
  [string]$ConfigPath = $(Join-Path $env:APPDATA "FinancPlantoes\backup-config.json")
)

$ErrorActionPreference = "Stop"

$configDir = Split-Path $ConfigPath -Parent
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$securePassword = Read-Host "Digite a senha do banco Supabase" -AsSecureString
$encryptedPassword = $securePassword | ConvertFrom-SecureString

$config = [ordered]@{
  database_host = $DatabaseHost
  database_port = $DatabasePort
  database_name = $DatabaseName
  database_user = $DatabaseUser
  output_dir = $OutputDir
  retention_days = $RetentionDays
  encrypted_password = $encryptedPassword
  created_at = (Get-Date).ToUniversalTime().ToString("o")
}

$config | ConvertTo-Json -Depth 4 | Set-Content -Path $ConfigPath -Encoding UTF8

Write-Output "Configuracao de backup salva com criptografia do Windows:"
Write-Output "  $ConfigPath"
Write-Output ""
Write-Output "Essa credencial so deve funcionar para o mesmo usuario do Windows que a salvou."
Write-Output "Nao copie esse arquivo para outro computador como se fosse backup de senha."
