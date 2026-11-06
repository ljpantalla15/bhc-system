# Restore script for Windows PowerShell
param(
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\18\bin"
if (Test-Path $pgBin) {
    $env:Path = "$pgBin;$env:Path"
}

if (-not $BackupFile) {
    $latest = Get-ChildItem -Path "backups\*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "No backup file specified and no backups found in backups/ directory."
    }
    $BackupFile = $latest.FullName
    Write-Host "No backup file specified. Using most recent: $BackupFile"
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file '$BackupFile' does not exist."
}

if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($name, $val, "Process")
        }
    }
}

$dbName = if ($env:RESTORE_DB) { $env:RESTORE_DB } elseif ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "bhc" }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$dbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$dbPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }

Write-Host "Restoring $BackupFile into database '$dbName'..."

$restored = $false

if (Get-Command docker -ErrorAction SilentlyContinue) {
    $isRunning = docker compose ps --status running db 2>$null | Select-String "db"
    if ($isRunning) {
        Write-Host "Restoring via docker compose 'db' container..."
        Get-Content $BackupFile | docker compose exec -T db psql -U $dbUser -d $dbName
        $restored = $true
    }
}

if (-not $restored) {
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        Write-Host "Restoring via local psql ($dbHost`:$dbPort)..."
        $env:PGPASSWORD = $env:POSTGRES_PASSWORD
        & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $BackupFile
        $restored = $true
    } else {
        Write-Error "Neither docker nor psql was found in PATH."
    }
}

Write-Host "Restore completed successfully into '$dbName'."
