# 🔧 Guide de Dépannage - UE 5.6 + MetaHuman

## 🚨 Problèmes Courants et Solutions

### 1. Problèmes de Connexion WebSocket

#### ❌ "WebSocket connection failed"

**Causes possibles** :
- UE n'est pas lancé en mode Standalone
- Port 8080 bloqué par le firewall
- Blueprint WebSocket mal configuré

**Solutions** :
```bash
# 1. Vérifier le mode de lancement UE
Play → Standalone Game (pas PIE - Play in Editor)

# 2. Vérifier le firewall Windows
Windows Security → Firewall → Allow an app
→ Ajouter UnrealEditor.exe et autoriser port 8080

# 3. Tester la connexion manuellement
telnet localhost 8080
```

**Code de test Blueprint** :
```
Event BeginPlay:
→ Print String: "WebSocket Manager Started"
→ Create WebSocket
→ Print String: "Attempting connection to: " + ServerURL
→ Connect
```

#### ❌ "Connection established but no response"

**Diagnostic** :
```
1. Vérifier les logs UE: Window → Developer Tools → Output Log
2. Chercher: "WebSocket" dans les logs
3. Vérifier la réception des messages JSON
```

**Solution Blueprint** :
```
OnMessage Event:
→ Print String: "Received: " + Message
→ Parse JSON
→ Print String: "Parsed Type: " + Type
```

### 2. Problèmes MetaHuman

#### ❌ MetaHuman ne s'affiche pas

**Vérifications** :
```
1. Content Browser → MetaHumans → [Nom] → BP_[Nom]
2. Vérifier que tous les assets sont importés:
   - Body meshes ✅
   - Face meshes ✅  
   - Hair assets ✅
   - Materials ✅
```

**Solution de réimport** :
```
1. Quixel Bridge → MetaHumans
2. Clic droit sur votre MetaHuman → Re-download
3. Delete existing assets dans UE
4. Re-import via Bridge
```

#### ❌ Animations faciales ne fonctionnent pas

**Diagnostic** :
```
1. Sélectionner le MetaHuman dans la scène
2. Details Panel → Mesh → Face
3. Vérifier: Blend Shapes présents
4. Test manuel: Set Blend Shape Weight
```

**Code Blueprint de test** :
```
Function TestFacialAnimation:
→ Get MetaHuman Face Component
→ Set Morph Target: "CTRL_expressions_browRaiseL" = 1.0
→ Delay 2 seconds
→ Set Morph Target: "CTRL_expressions_browRaiseL" = 0.0
```

### 3. Problèmes de Performance

#### ❌ FPS faible / Lag important

**Diagnostic performance** :
```
Console Commands (` key):
stat fps          # Afficher FPS
stat gpu          # Performance GPU
stat memory       # Utilisation mémoire
stat lumen        # Performance Lumen
stat nanite       # Performance Nanite
```

**Optimisations Lumen** :
```
Console Commands:
r.Lumen.GlobalIllumination.Quality 2    # 0=Low, 4=Epic
r.Lumen.Reflections.Quality 2
r.Lumen.UpdateRate 30                   # Réduire de 60 à 30
```

**Optimisations Nanite** :
```
Console Commands:
r.Nanite.MaxTriangles 1000000          # Réduire si nécessaire
r.Nanite.ClusterCulling 1              # Activer culling
```

**Paramètres recommandés par GPU** :
```
RTX 4090/4080:
- Lumen Quality: Epic (4)
- Nanite Max Triangles: 5M
- Resolution: 4K

RTX 4070/3080:
- Lumen Quality: High (3)  
- Nanite Max Triangles: 2M
- Resolution: 1440p

RTX 3070/4060:
- Lumen Quality: Medium (2)
- Nanite Max Triangles: 1M
- Resolution: 1080p
```

### 4. Problèmes Audio MetaSound

#### ❌ Pas de son / Audio coupé

**Vérifications** :
```
1. Edit → Plugins → MetaSounds ✅ Enabled
2. Project Settings → Audio → Default Sound Class
3. Windows Sound Settings → Default Device
```

**Test MetaSound** :
```
Content Browser → Add → Sounds → MetaSound Source
→ Créer un simple sine wave
→ Play in game
```

**Blueprint Audio Test** :
```
Function TestAudio:
→ Play Sound 2D: [MetaSound Asset]
→ Print String: "Playing MetaSound"
```

### 5. Problèmes Chaos Physics

#### ❌ Vêtements/Cheveux figés

**Vérifications** :
```
1. Edit → Plugins → Chaos Physics ✅ Enabled
2. MetaHuman → Hair/Clothing → Physics Asset
3. Simulation Settings → Enable Simulation
```

**Réinitialisation Physics** :
```
1. Sélectionner MetaHuman
2. Details → Physics → Simulate Physics ✅
3. Restart Physics Simulation
```

### 6. Erreurs de Compilation

#### ❌ "Blueprint compilation failed"

**Solutions générales** :
```
1. Build → Refresh All Nodes
2. Build → Compile All Blueprints  
3. File → Refresh All
4. Restart Unreal Editor
```

**Erreurs spécifiques WebSocket** :
```
Error: "WebSocket module not found"
Solution: 
1. Edit → Plugins → WebSocket Networking ✅
2. Restart Editor
3. Regenerate Project Files
```

**Erreurs MetaHuman** :
```
Error: "MetaHuman class not found"
Solution:
1. Verify MetaHuman plugin enabled
2. Content Browser → Show Plugin Content ✅
3. Reimport MetaHuman assets
```

### 7. Problèmes Système

#### ❌ Crash au démarrage UE

**Logs à vérifier** :
```
%LOCALAPPDATA%\UnrealEngine\5.6\Saved\Logs\
→ Ouvrir le dernier .log
→ Chercher "FATAL ERROR" ou "CRASH"
```

**Solutions crash GPU** :
```
1. Mettre à jour pilotes GPU
2. Réduire settings graphiques:
   r.DefaultFeature.AntiAliasing 0
   r.PostProcessAAQuality 0
   r.Lumen.GlobalIllumination 0
```

**Solutions crash mémoire** :
```
1. Fermer autres applications
2. Augmenter virtual memory Windows
3. Réduire texture quality:
   r.Streaming.PoolSize 2000
```

#### ❌ "Out of video memory"

**Solutions immédiates** :
```
Console Commands:
r.TextureStreaming 1
r.Streaming.LimitPoolSizeToVRAM 1
r.Streaming.PoolSize 1000        # MB
```

**Optimisations long terme** :
```
1. Project Settings → Rendering → Textures
   → Max Texture Dimension: 2048 (au lieu de 4096)
2. MetaHuman textures → Compression Settings → High
3. Disable unused features (Lumen/Nanite si pas nécessaire)
```

## 🔍 Outils de Diagnostic

### Commandes Console Utiles

```bash
# Performance
stat fps
stat gpu  
stat memory
stat lumen
stat nanite

# Debug WebSocket
log LogWebSocket Verbose

# Debug MetaHuman
log LogMetaHuman Verbose
log LogAnimation Verbose

# Debug Audio
log LogAudio Verbose
log LogMetaSound Verbose

# Rendering
r.ScreenPercentage 50          # Réduire résolution
r.VisualizeGPU 1              # Voir utilisation GPU
r.ProfileGPU                  # Profile GPU détaillé
```

### Fichiers de Log Importants

```
%LOCALAPPDATA%\UnrealEngine\5.6\Saved\Logs\
├── UnrealEditor.log          # Log principal
├── UnrealEditor-backup-*.log # Logs précédents  
└── Crashes\                  # Crash reports

Project\Saved\Logs\
├── ProjectName.log           # Log du projet
└── Stats\                    # Statistiques perf
```

## 📞 Support et Ressources

### Communauté
- **Discord UE** : https://discord.gg/unrealengine
- **Forum MetaHuman** : https://forums.unrealengine.com/c/metahuman/
- **Reddit** : r/unrealengine

### Documentation Officielle
- **UE 5.6 Docs** : https://docs.unrealengine.com/5.6/
- **MetaHuman Docs** : https://docs.unrealengine.com/5.6/metahuman/
- **WebSocket Plugin** : https://docs.unrealengine.com/5.6/websocket/

### Outils Externes
- **GPU-Z** : Monitoring GPU
- **MSI Afterburner** : Overclock/Monitoring  
- **Process Monitor** : Debug fichiers/registry
- **Wireshark** : Debug réseau/WebSocket

## 🆘 Procédure d'Escalade

### Niveau 1 : Auto-diagnostic
1. Consulter ce guide
2. Vérifier logs UE
3. Tester avec projet minimal

### Niveau 2 : Communauté  
1. Forum Unreal Engine
2. Discord communautaire
3. Reddit avec logs/screenshots

### Niveau 3 : Support Officiel
1. Epic Games Support
2. Bug report avec reproduction steps
3. Crash reports automatiques

---

**💡 Conseil** : Gardez toujours une sauvegarde de votre projet fonctionnel avant d'appliquer des modifications importantes !
