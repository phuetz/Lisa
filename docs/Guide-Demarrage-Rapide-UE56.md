# 🚀 Guide de Démarrage Rapide - UE 5.6 + MetaHuman

## ⚡ Installation Express (30 minutes)

### 1. Prérequis Rapides
```bash
# Vérifier votre système
- RAM : 16+ GB ✅
- GPU : DirectX 12 compatible ✅  
- Espace : 150+ GB libres ✅
```

### 2. Installation UE 5.6 (15 min)
1. **Epic Games Launcher** → https://www.epicgames.com/store/download
2. **Unreal Engine tab** → Install Engine → Version 5.6
3. **Composants** : Core + Starter Content + Templates
4. **Attendre l'installation** ☕

### 3. Projet MetaHuman (10 min)
1. **Nouveau Projet** : Third Person Template
2. **Nom** : `Lisa_MetaHuman_Project`
3. **Settings** : Maximum Quality + Raytracing
4. **Plugins** → Activer :
   - ✅ MetaHuman
   - ✅ Web Socket Networking
   - ✅ MetaSounds
   - ✅ Chaos Physics

### 4. MetaHuman Creator (5 min)
1. **Browser** → https://metahuman.unrealengine.com/
2. **Créer un avatar** → Nommer `Lisa_Avatar`
3. **Download** → Unreal Engine Project
4. **Import via Quixel Bridge** dans UE

## 🔧 Configuration WebSocket Rapide

### Blueprint WebSocket (Copier-Coller)

Créer `BP_WebSocketManager` avec ce code :

**Variables** :
```
WebSocket : WebSocket Reference
ServerURL : String = "ws://localhost:8080/metahuman"
IsConnected : Boolean = false
MetaHumanRef : Actor Reference
```

**Event BeginPlay** :
```
1. Create WebSocket → Set WebSocket
2. Bind Event (OnConnected) → Set IsConnected = true
3. Bind Event (OnMessage) → Call HandleMessage
4. Connect (ServerURL)
5. Get Actor of Class (MetaHuman) → Set MetaHumanRef
```

**Function HandleMessage** :
```
Input: Message (String)

1. Parse JSON Message
2. Get "type" field
3. Switch on type:
   - "expression" → Call SetExpression
   - "speech" → Call PlaySpeech  
   - "lumen" → Call ConfigureLumen
   - "pose" → Call SetPose
```

## 🎮 Test Rapide

### 1. Lancer UE Project
```
Play → Standalone Game
```

### 2. Lancer Lisa
```bash
cd C:\Users\patri\CascadeProjects\Lisa
npm run dev
```

### 3. Test Connexion
- Ouvrir Lisa dans le navigateur
- Aller aux contrôles MetaHuman UE56
- Cliquer "Connect" → Status : "Connecté" ✅

### 4. Test Expression
```javascript
// Console navigateur
setExpression({ name: 'joy', intensity: 0.8 });
```

## 🆘 Dépannage Express

| Problème | Solution Rapide |
|----------|----------------|
| WebSocket failed | Redémarrer UE en Standalone |
| MetaHuman invisible | Recompiler BP + Restart Editor |
| Lag/Performance | Lumen Quality → Medium |
| Audio silent | Vérifier MetaSounds plugin |

## 📋 Checklist Final

- [ ] UE 5.6 installé et lancé
- [ ] Projet créé avec plugins activés
- [ ] MetaHuman importé via Quixel Bridge
- [ ] BP_WebSocketManager configuré
- [ ] Lisa connecté via WebSocket
- [ ] Test expression réussi

**🎉 Prêt ! Votre MetaHuman UE 5.6 fonctionne avec Lisa !**

---

**Temps total : ~30 minutes**  
**Pour plus de détails** : Voir `Guide-Installation-UE56-MetaHuman.md`
