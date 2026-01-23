# ============================================
# Lisa - Script de lancement Android Emulator
# ============================================
# Usage: .\scripts\run-android.ps1
# ============================================

param(
    [switch]$Release,
    [switch]$Clean,
    [switch]$NoEmulator,
    [string]$Device = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ProjectRoot) { $ProjectRoot = (Get-Location).Path }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Lisa - Android Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Android SDK
$AndroidHome = $env:ANDROID_HOME
if (-not $AndroidHome) {
    $AndroidHome = "$env:LOCALAPPDATA\Android\Sdk"
}

if (-not (Test-Path $AndroidHome)) {
    Write-Host "[ERROR] Android SDK not found at $AndroidHome" -ForegroundColor Red
    Write-Host "Please install Android Studio and set ANDROID_HOME" -ForegroundColor Yellow
    exit 1
}

$ADB = "$AndroidHome\platform-tools\adb.exe"
$Emulator = "$AndroidHome\emulator\emulator.exe"

Write-Host "[INFO] Android SDK: $AndroidHome" -ForegroundColor Gray

# Function to list available emulators
function Get-AvailableEmulators {
    $emulatorList = & $Emulator -list-avds 2>$null
    return $emulatorList
}

# Function to check if emulator is running
function Test-EmulatorRunning {
    $devices = & $ADB devices 2>$null
    return $devices -match "emulator-\d+"
}

# Function to start emulator
function Start-AndroidEmulator {
    param([string]$AvdName)
    
    Write-Host "[INFO] Starting emulator: $AvdName" -ForegroundColor Yellow
    Start-Process -FilePath $Emulator -ArgumentList "-avd", $AvdName, "-no-snapshot-load" -WindowStyle Hidden
    
    Write-Host "[INFO] Waiting for emulator to boot..." -ForegroundColor Yellow
    $timeout = 120
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        
        $bootComplete = & $ADB shell getprop sys.boot_completed 2>$null
        if ($bootComplete -eq "1") {
            Write-Host "[OK] Emulator is ready!" -ForegroundColor Green
            return $true
        }
        
        Write-Host "." -NoNewline
    }
    
    Write-Host ""
    Write-Host "[ERROR] Emulator failed to start within $timeout seconds" -ForegroundColor Red
    return $false
}

# Step 1: Build the app
Write-Host ""
Write-Host "[STEP 1/4] Building Lisa..." -ForegroundColor Cyan

Set-Location $ProjectRoot

if ($Clean) {
    Write-Host "[INFO] Cleaning previous build..." -ForegroundColor Yellow
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
}

Write-Host "[INFO] Running pnpm build..." -ForegroundColor Yellow
& pnpm build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Build successful!" -ForegroundColor Green

# Step 2: Sync with Capacitor
Write-Host ""
Write-Host "[STEP 2/4] Syncing with Capacitor..." -ForegroundColor Cyan

Set-Location "$ProjectRoot\apps\mobile"
& npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Sync successful!" -ForegroundColor Green

# Step 3: Start emulator (if needed)
Write-Host ""
Write-Host "[STEP 3/4] Preparing Android device..." -ForegroundColor Cyan

if (-not $NoEmulator) {
    if (-not (Test-EmulatorRunning)) {
        $emulators = Get-AvailableEmulators
        
        if (-not $emulators) {
            Write-Host "[ERROR] No Android emulators found!" -ForegroundColor Red
            Write-Host "Create one in Android Studio > Device Manager" -ForegroundColor Yellow
            exit 1
        }
        
        # Use specified device or first available
        if ($Device) {
            $selectedEmulator = $Device
        } else {
            $selectedEmulator = ($emulators -split "`n")[0]
        }
        
        Write-Host "[INFO] Available emulators:" -ForegroundColor Gray
        $emulators | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
        
        $started = Start-AndroidEmulator -AvdName $selectedEmulator
        if (-not $started) { exit 1 }
    } else {
        Write-Host "[OK] Emulator already running!" -ForegroundColor Green
    }
}

# Step 4: Run the app
Write-Host ""
Write-Host "[STEP 4/4] Launching Lisa on Android..." -ForegroundColor Cyan

if ($Release) {
    Write-Host "[INFO] Building release APK..." -ForegroundColor Yellow
    & npx cap run android --release
} else {
    Write-Host "[INFO] Running debug build..." -ForegroundColor Yellow
    & npx cap run android
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to run on Android!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Lisa is running on Android!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tips:" -ForegroundColor Yellow
Write-Host "  - Shake device to open React DevTools" -ForegroundColor Gray
Write-Host "  - Use 'adb logcat' to view logs" -ForegroundColor Gray
Write-Host "  - Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""
