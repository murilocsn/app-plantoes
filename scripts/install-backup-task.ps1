param(
  [string]$TaskName = "FinancPlantoes Backup",
  [int]$IntervalHours = 6
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backupScript = Join-Path $PSScriptRoot "backup-supabase.ps1"

if (-not (Test-Path $backupScript)) {
  throw "Script de backup nao encontrado: $backupScript"
}

$actionArgument = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgument -WorkingDirectory $repoRoot.Path
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Gera backup do FinancPlantoes no Google Drive a cada $IntervalHours horas." -Force | Out-Null

Write-Output "Tarefa agendada criada/atualizada:"
Write-Output "  $TaskName"
Write-Output ""
Write-Output "Primeira execucao prevista em aproximadamente 5 minutos."
Write-Output "Depois disso, a cada $IntervalHours horas."
