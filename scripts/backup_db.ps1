# Backup MongoDB using DATABASE_URL from .env or environment
# Usage: .\scripts\backup_db.ps1

param(
    [string]$OutDir = "./db_backups"
)

Write-Host "Starting MongoDB backup..."

# Try to read DATABASE_URL from environment
$databaseUrl = $env:DATABASE_URL

# If not in env, try to read from .env
if (-not $databaseUrl -and Test-Path -Path ".env") {
    $envFile = Get-Content .env | Where-Object { $_ -match "^DATABASE_URL=" }
    if ($envFile) {
        $databaseUrl = ($envFile -split "=",2)[1].Trim('"')
    }
}

if (-not $databaseUrl) {
    Write-Error "DATABASE_URL not found in environment or .env. Please set it before running the script."
    exit 1
}

# Ensure mongodump is available
$mongodump = Get-Command mongodump -ErrorAction SilentlyContinue
if (-not $mongodump) {
    Write-Error "mongodump not found. Please install MongoDB Database Tools: https://www.mongodb.com/docs/database-tools/installation/"
    exit 1
}

# Prepare output directory
$timeStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outPath = Join-Path -Path $OutDir -ChildPath "backup-$timeStamp"
New-Item -ItemType Directory -Path $outPath -Force | Out-Null

# Run mongodump
Write-Host "Running mongodump to $outPath"
$escapedUri = $databaseUrl
& mongodump --uri $escapedUri --out $outPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completed: $outPath"
} else {
    Write-Error "mongodump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
