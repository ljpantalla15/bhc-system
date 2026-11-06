# Backup script for Windows PowerShell
$ErrorActionPreference = "Stop"

$pgBin = "C:\Program Files\PostgreSQL\18\bin"
if (Test-Path $pgBin) {
    $env:Path = "$pgBin;$env:Path"
}

# Parse .env if present
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

$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "bhc" }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$dbHost = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$dbPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$backupFile = Join-Path $backupDir "bhc_backup_$timestamp.sql"
Write-Host "Creating database backup at $backupFile..."

if (Get-Command docker -ErrorAction SilentlyContinue) {
    # Check if docker compose service is running
    $isRunning = docker compose ps --status running db 2>$null | Select-String "db"
    if ($isRunning) {
        Write-Host "Backing up from docker compose 'db' container..."
        docker compose exec -T db pg_dump -U $dbUser -d $dbName --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $backupFile -Encoding utf8
    }
}

if (-not (Test-Path $backupFile) -or (Get-Item $backupFile).Length -eq 0) {
    if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
        Write-Host "Backing up from PostgreSQL instance ($dbHost`:$dbPort)..."
        $env:PGPASSWORD = $env:POSTGRES_PASSWORD
        & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $backupFile -Encoding utf8
    } else {
        Write-Error "Neither docker nor pg_dump was found in PATH."
    }
}

if ((Test-Path $backupFile) -and (Get-Item $backupFile).Length -gt 0) {
    $bytes = (Get-Item $backupFile).Length
    Write-Host "Backup completed successfully: $backupFile ($bytes bytes)"
} else {
    Write-Error "Backup failed or generated an empty file."
}
