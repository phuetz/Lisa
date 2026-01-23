# Script d'automatisation - Setup UE 5.6 + MetaHuman pour Lisa
# Auteur: Lisa AI Assistant
# Version: 1.0

param(
    [string]$ProjectName = "Lisa_MetaHuman_Project",
    [string]$ProjectPath = "$env:USERPROFILE\Documents\Unreal Projects",
    [switch]$SkipDownloads,
    [switch]$Verbose
)

Write-Host "🚀 Script d'installation UE 5.6 + MetaHuman pour Lisa" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Fonction de logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# Vérification des prérequis système
function Test-SystemRequirements {
    Write-Log "Vérification des prérequis système..." "INFO"
    
    # Vérifier la RAM
    $ram = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).sum / 1GB
    if ($ram -lt 16) {
        Write-Log "⚠️  RAM insuffisante: ${ram}GB détectés, 16GB minimum requis" "WARN"
    } else {
        Write-Log "✅ RAM: ${ram}GB détectés" "SUCCESS"
    }
    
    # Vérifier l'espace disque
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
    if ($freeSpaceGB -lt 150) {
        Write-Log "⚠️  Espace disque insuffisant: ${freeSpaceGB}GB libres, 150GB minimum requis" "WARN"
    } else {
        Write-Log "✅ Espace disque: ${freeSpaceGB}GB libres" "SUCCESS"
    }
    
    # Vérifier DirectX
    try {
        $dxdiag = Get-Command dxdiag -ErrorAction Stop
        Write-Log "✅ DirectX disponible" "SUCCESS"
    } catch {
        Write-Log "⚠️  DirectX non détecté" "WARN"
    }
}

# Vérifier l'installation d'Epic Games Launcher
function Test-EpicGamesLauncher {
    Write-Log "Vérification d'Epic Games Launcher..." "INFO"
    
    $epicPaths = @(
        "${env:ProgramFiles(x86)}\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe",
        "${env:ProgramFiles}\Epic Games\Launcher\Portal\Binaries\Win32\EpicGamesLauncher.exe"
    )
    
    $epicFound = $false
    foreach ($path in $epicPaths) {
        if (Test-Path $path) {
            Write-Log "✅ Epic Games Launcher trouvé: $path" "SUCCESS"
            $epicFound = $true
            break
        }
    }
    
    if (-not $epicFound) {
        Write-Log "❌ Epic Games Launcher non trouvé" "ERROR"
        Write-Log "Téléchargez-le depuis: https://www.epicgames.com/store/download" "INFO"
        return $false
    }
    
    return $true
}

# Vérifier l'installation d'Unreal Engine 5.6
function Test-UnrealEngine56 {
    Write-Log "Vérification d'Unreal Engine 5.6..." "INFO"
    
    $uePaths = @(
        "${env:ProgramFiles}\Epic Games\UE_5.6",
        "${env:ProgramFiles(x86)}\Epic Games\UE_5.6"
    )
    
    foreach ($path in $uePaths) {
        if (Test-Path "$path\Engine\Binaries\Win64\UnrealEditor.exe") {
            Write-Log "✅ Unreal Engine 5.6 trouvé: $path" "SUCCESS"
            return $path
        }
    }
    
    Write-Log "❌ Unreal Engine 5.6 non trouvé" "ERROR"
    Write-Log "Installez UE 5.6 via Epic Games Launcher" "INFO"
    return $null
}

# Créer la structure de projet
function New-ProjectStructure {
    param([string]$Path)
    
    Write-Log "Création de la structure de projet..." "INFO"
    
    $folders = @(
        "$Path\Content\MetaHumans",
        "$Path\Content\Blueprints\WebSocket",
        "$Path\Content\Audio\MetaSounds",
        "$Path\Content\Materials\MetaHuman",
        "$Path\Source\Private",
        "$Path\Source\Public"
    )
    
    foreach ($folder in $folders) {
        if (-not (Test-Path $folder)) {
            New-Item -ItemType Directory -Path $folder -Force | Out-Null
            Write-Log "📁 Créé: $folder" "INFO"
        }
    }
}

# Générer le fichier .uproject
function New-UProjectFile {
    param([string]$ProjectPath, [string]$ProjectName)
    
    $uprojectPath = "$ProjectPath\$ProjectName.uproject"
    
    $uprojectContent = @"
{
    "FileVersion": 3,
    "EngineAssociation": "5.6",
    "Category": "",
    "Description": "Lisa MetaHuman Integration Project",
    "Modules": [
        {
            "Name": "$ProjectName",
            "Type": "Runtime",
            "LoadingPhase": "Default"
        }
    ],
    "Plugins": [
        {
            "Name": "MetaHuman",
            "Enabled": true
        },
        {
            "Name": "WebSocketNetworking",
            "Enabled": true
        },
        {
            "Name": "MetaSounds",
            "Enabled": true
        },
        {
            "Name": "ChaosPhysics",
            "Enabled": true
        },
        {
            "Name": "LiveLink",
            "Enabled": true
        },
        {
            "Name": "ControlRig",
            "Enabled": true
        },
        {
            "Name": "IKRig",
            "Enabled": true
        }
    ],
    "TargetPlatforms": [
        "Windows"
    ]
}
"@
    
    $uprojectContent | Out-File -FilePath $uprojectPath -Encoding UTF8
    Write-Log "✅ Fichier .uproject créé: $uprojectPath" "SUCCESS"
}

# Créer le Blueprint WebSocket Manager
function New-WebSocketBlueprint {
    param([string]$ProjectPath)
    
    Write-Log "Création du template Blueprint WebSocket..." "INFO"
    
    $blueprintTemplate = @"
# Blueprint WebSocket Manager Template
# Copiez ce code dans votre Blueprint UE

## Variables à créer:
- WebSocket (WebSocket Reference)
- ServerURL (String) = "ws://localhost:8080/metahuman"  
- IsConnected (Boolean) = false
- MetaHumanRef (Actor Reference)

## Event BeginPlay:
1. Create WebSocket → Set WebSocket
2. Bind Event (OnConnected) → Set IsConnected = true
3. Bind Event (OnMessage) → Call HandleMessage
4. Connect (ServerURL)
5. Get Actor of Class (MetaHuman) → Set MetaHumanRef

## Function HandleMessage:
Input: Message (String)
1. Parse JSON Message
2. Get "type" field  
3. Switch on type:
   - "expression" → Call SetExpression
   - "speech" → Call PlaySpeech
   - "lumen" → Call ConfigureLumen
   - "pose" → Call SetPose
   - "nanite" → Call ConfigureNanite
   - "chaos" → Call ConfigureChaos
   - "metasound" → Call PlayMetaSound

## Function SetExpression:
Input: ExpressionName (String), Intensity (Float)
1. Get MetaHuman Face Component
2. Set Blend Shape Weight

## Function ConfigureLumen:
Input: Quality (String), GI_Enabled (Boolean)
1. Get Rendering Settings
2. Set Lumen Quality Level
3. Set Global Illumination

## Function ConfigureNanite:
Input: Enabled (Boolean), MaxTriangles (Integer)
1. Get Nanite Settings
2. Set Nanite Enabled
3. Set Triangle Budget
"@
    
    $templatePath = "$ProjectPath\Content\Blueprints\WebSocket\BP_WebSocketManager_Template.txt"
    $blueprintTemplate | Out-File -FilePath $templatePath -Encoding UTF8
    Write-Log "📝 Template Blueprint créé: $templatePath" "SUCCESS"
}

# Créer les fichiers de configuration
function New-ConfigFiles {
    param([string]$ProjectPath)
    
    Write-Log "Création des fichiers de configuration..." "INFO"
    
    # DefaultEngine.ini
    $engineConfig = @"
[/Script/EngineSettings.GameMapsSettings]
GameDefaultMap=/Game/ThirdPerson/Maps/ThirdPersonMap
EditorStartupMap=/Game/ThirdPerson/Maps/ThirdPersonMap

[/Script/Engine.RendererSettings]
r.DefaultFeature.AutoExposure.ExtendDefaultLuminanceRange=True
r.Lumen.GlobalIllumination=1
r.Lumen.Reflections=1
r.Nanite=1
r.AntiAliasing=2

[/Script/MetaHuman.MetaHumanSettings]
bEnableMetaHuman=True
DefaultQualityLevel=High

[/Script/WebSocketNetworking.WebSocketSettings]
bEnableWebSocket=True
DefaultPort=8080
"@
    
    $configPath = "$ProjectPath\Config"
    if (-not (Test-Path $configPath)) {
        New-Item -ItemType Directory -Path $configPath -Force | Out-Null
    }
    
    $engineConfig | Out-File -FilePath "$configPath\DefaultEngine.ini" -Encoding UTF8
    Write-Log "⚙️  Configuration moteur créée" "SUCCESS"
}

# Fonction principale
function Start-Setup {
    Write-Log "Début de l'installation automatisée..." "INFO"
    
    # Vérifications préliminaires
    Test-SystemRequirements
    
    if (-not (Test-EpicGamesLauncher)) {
        Write-Log "Installation interrompue: Epic Games Launcher requis" "ERROR"
        return
    }
    
    $uePath = Test-UnrealEngine56
    if (-not $uePath) {
        Write-Log "Installation interrompue: Unreal Engine 5.6 requis" "ERROR"
        return
    }
    
    # Création du projet
    $fullProjectPath = "$ProjectPath\$ProjectName"
    
    if (Test-Path $fullProjectPath) {
        Write-Log "⚠️  Le projet existe déjà: $fullProjectPath" "WARN"
        $response = Read-Host "Voulez-vous continuer? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Log "Installation annulée par l'utilisateur" "INFO"
            return
        }
    }
    
    # Créer la structure
    New-Item -ItemType Directory -Path $fullProjectPath -Force | Out-Null
    New-ProjectStructure -Path $fullProjectPath
    New-UProjectFile -ProjectPath $fullProjectPath -ProjectName $ProjectName
    New-WebSocketBlueprint -ProjectPath $fullProjectPath
    New-ConfigFiles -ProjectPath $fullProjectPath
    
    Write-Log "🎉 Installation terminée avec succès!" "SUCCESS"
    Write-Log "Projet créé: $fullProjectPath" "INFO"
    Write-Log "" "INFO"
    Write-Log "Prochaines étapes:" "INFO"
    Write-Log "1. Ouvrir le projet dans UE 5.6" "INFO"
    Write-Log "2. Importer un MetaHuman via Quixel Bridge" "INFO"
    Write-Log "3. Créer le Blueprint WebSocket avec le template fourni" "INFO"
    Write-Log "4. Tester la connexion avec Lisa" "INFO"
}

# Exécution du script
try {
    Start-Setup
} catch {
    Write-Log "Erreur durant l'installation: $($_.Exception.Message)" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
}

Write-Host "`n🚀 Script terminé. Consultez les guides de documentation pour les étapes suivantes." -ForegroundColor Cyan
