#!/usr/bin/env pwsh
# -----------------------------------------------------------------------------
# Launch script for full local stack: Postgres ➜ Prisma ➜ API ➜ Frontend
# -----------------------------------------------------------------------------
# Prerequisites:
# - Docker Desktop running
# - Node.js + npm installed
# - .env configured with DATABASE_URL using port 5433

param(
    [switch]$SkipMigrate
)

function Run-Step($Message, $Command) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Step failed: $Message"
        exit $LASTEXITCODE
    }
}

# 1️⃣ Start (or ensure) Postgres container is up
Run-Step "Starting Postgres container (docker compose up -d)" {
    docker compose up -d
}

# 2️⃣ Apply Prisma migrations unless --SkipMigrate given
if (-not $SkipMigrate) {
    Run-Step "Applying Prisma migrations" {
        npx prisma migrate deploy
    }
}

# 3️⃣ Build API (TypeScript ➜ JS) & start API in background
Run-Step "Building API (tsc)" {
    npm run build:api
}

Write-Host "Launching API server..." -ForegroundColor Cyan
Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "dist/api/index.js" -WorkingDirectory (Get-Location)

# 4️⃣ Start frontend Vite dev server (foreground)
Run-Step "Starting Vite dev server" {
    npm run dev
}
