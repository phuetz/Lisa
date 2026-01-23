# 🧪 Guide de Test - Connexion Android → LM Studio

Ce guide vous aide à tester et valider la correction de la communication entre l'application Android et LM Studio.

---

## 📋 Pré-requis

Avant de commencer les tests, assurez-vous que :

- [ ] LM Studio est démarré sur votre PC
- [ ] Un modèle est chargé dans LM Studio (ex: `mistralai/devstral-small-2-2512`)
- [ ] Le serveur local est démarré dans LM Studio (onglet `<->` Local Server)
- [ ] Android Studio est installé
- [ ] L'émulateur Android est lancé OU votre appareil est connecté en USB

---

## 🚀 Déploiement de la Correction

### 1. Build l'application web
```bash
cd c:\Users\patri\CascadeProjects\Lisa
pnpm build
```

**Attendu**: Build réussi, fichiers dans `dist/`

### 2. Sync avec Android
```bash
cd apps/mobile
npx cap sync android
```

**Attendu**:
```
✔ Copying web assets from dist to android\app\src\main\assets\public in 2.34s
✔ Creating capacitor.config.json in android\app\src\main\assets in 1.23ms
✔ copy android in 2.35s
✔ Updating Android plugins in 5.67ms
```

### 3. Ouvrir Android Studio
```bash
npx cap open android
```

**Attendu**: Android Studio s'ouvre avec le projet

---

## 🔧 Configuration Réseau

### Option A : Émulateur Android

#### 1. Configurer ADB Reverse
```bash
# Depuis le terminal Windows
adb reverse tcp:1234 tcp:1234
```

**Vérification**:
```bash
adb reverse --list
```
**Attendu**: `tcp:1234 -> tcp:1234`

#### 2. Vérifier la Configuration
**Fichier**: `src/config/networkConfig.ts` (ligne 22)
```typescript
const MOBILE_LM_STUDIO_HOST = 'localhost'; // ← Doit être 'localhost'
```

### Option B : Appareil Physique (WiFi)

#### 1. Trouver l'IP de votre PC
```bash
ipconfig
```
Cherchez l'adresse IPv4 de votre carte WiFi (ex: `192.168.1.45`)

#### 2. Configurer l'IP dans l'Application
**Fichier**: `src/config/networkConfig.ts` (ligne 22)
```typescript
const MOBILE_LM_STUDIO_HOST = '192.168.1.45'; // ← Votre IP locale
```

#### 3. Configurer LM Studio
- Dans LM Studio → Local Server
- Cocher **"Serve on Local Network"**
- Vérifier que le serveur écoute sur `0.0.0.0:1234`

#### 4. Rebuild après changement d'IP
```bash
pnpm build && cd apps/mobile && npx cap sync
```

---

## ✅ Tests de Validation

### Test 1 : Vérifier les Logs au Démarrage

**Action**: Lancer l'app sur Android (bouton Run ▶️ dans Android Studio)

**Logcat** (Filtre: `Web Console` ou `System.out`):
```
[NetworkConfig] isNative: true hostname: lisa.ai
[NetworkConfig] 📱 Mobile detected. Using LM Studio at: http://localhost:1234/v1
[NetworkConfig] 💡 If connection fails, check GUIDE_CONNEXION_MOBILE.md
```

**✅ Succès si**: Vous voyez `Mobile detected` et l'URL correcte
**❌ Échec si**: Vous voyez `/lmstudio/v1` (proxy web) → Reconstruire l'app

---

### Test 2 : Test de Disponibilité

**Action**: Attendre 2-3 secondes après le lancement de l'app

**Logcat**:
```
[LMStudioService] Testing availability of http://localhost:1234/v1... (CapacitorHttp)
[LMStudioService] ✅ Connected to http://localhost:1234/v1
```

**✅ Succès si**: Vous voyez `(CapacitorHttp)` ET `✅ Connected`
**❌ Échec si**:
- `❌ Network Error` → Vérifier ADB reverse ou IP
- `(fetch)` au lieu de `(CapacitorHttp)` → L'app croit être en mode web

---

### Test 3 : Envoyer un Message Simple

**Action**:
1. Ouvrir l'interface de chat dans l'app
2. Taper : `Bonjour, quel est ton nom ?`
3. Appuyer sur Envoyer

**Logcat**:
```
[LMStudioService] Requesting http://localhost:1234/v1/chat/completions (CapacitorHttp)
[LMStudioService] chatStream starting (mobile fallback)
[LMStudioService] CapacitorHttp response status: 200
```

**LM Studio (Logs)**:
```
POST /v1/chat/completions
Model: mistralai/devstral-small-2-2512
Messages: [system, user]
```

**App (Interface)**:
- Message utilisateur s'affiche
- Réponse de Lisa apparaît (peut être d'un coup, c'est normal sur mobile)

**✅ Succès si**:
- Logs montrent status 200
- LM Studio affiche la requête
- Réponse visible dans l'app

**❌ Échec si**:
- Timeout → Problème réseau
- Status 400/500 → Problème avec le payload
- Pas de requête dans LM Studio → Ne passe pas par la bonne URL

---

### Test 4 : Test de Résilience

**Action**:
1. Arrêter LM Studio
2. Envoyer un message depuis l'app
3. Redémarrer LM Studio
4. Envoyer un autre message

**Logcat après arrêt**:
```
[LMStudioService] ❌ http://localhost:1234/v1: Network error
[LMStudioService] Could not connect to any LM Studio URL.
```

**Logcat après redémarrage**:
```
[LMStudioService] Testing availability of http://localhost:1234/v1... (CapacitorHttp)
[LMStudioService] ✅ Connected to http://localhost:1234/v1
```

**✅ Succès si**: L'app détecte la déconnexion puis la reconnexion

---

## 🐛 Dépannage

### Problème : `isNative: false` dans les logs

**Cause**: L'app pense être en mode web

**Solution**:
```bash
# Vérifier que dist/ existe
ls dist/

# Re-sync Capacitor
cd apps/mobile
npx cap sync android

# Vérifier capacitor.config.ts
cat capacitor.config.ts
```

### Problème : `Network Error` ou `Connection refused`

**Causes possibles**:

1. **ADB reverse pas configuré** (émulateur)
   ```bash
   adb reverse tcp:1234 tcp:1234
   adb reverse --list  # Vérifier
   ```

2. **Mauvaise IP** (appareil physique)
   - Vérifier l'IP du PC : `ipconfig`
   - Vérifier `networkConfig.ts` ligne 22
   - Rebuild après changement

3. **LM Studio pas démarré ou mauvais port**
   ```bash
   # Tester depuis le PC
   curl http://localhost:1234/v1/models
   ```

4. **Pare-feu Windows**
   - Autoriser Node.js/LM Studio sur le port 1234
   - Paramètres Windows → Pare-feu → Applications autorisées

### Problème : Logs montrent `(fetch)` au lieu de `(CapacitorHttp)`

**Cause**: Le code n'utilise pas la bonne méthode

**Solution**:
```bash
# Vérifier que les changements sont bien dans le fichier
cat src/services/LMStudioService.ts | grep -i "CapacitorHttp"

# Si absent, récupérer les changements
git status
git diff src/services/LMStudioService.ts

# Rebuild
pnpm build && cd apps/mobile && npx cap sync
```

---

## 📊 Checklist Complète

### Configuration
- [ ] LM Studio démarré avec modèle chargé
- [ ] Serveur local actif dans LM Studio
- [ ] Option A: ADB reverse configuré (émulateur)
- [ ] Option B: IP correcte dans `networkConfig.ts` (appareil)
- [ ] Option B: LM Studio en mode "Serve on Local Network"

### Build & Déploiement
- [ ] `pnpm build` réussi
- [ ] `npx cap sync android` réussi
- [ ] App installée sur l'émulateur/appareil

### Tests
- [ ] ✅ Test 1: Logs montrent "Mobile detected"
- [ ] ✅ Test 2: Connexion établie avec `(CapacitorHttp)`
- [ ] ✅ Test 3: Message envoyé et réponse reçue
- [ ] ✅ Test 4: Détection de déconnexion/reconnexion

---

## 🎯 Résultat Attendu Final

```
[NetworkConfig] 📱 Mobile detected. Using LM Studio at: http://localhost:1234/v1
[LMStudioService] Testing availability... (CapacitorHttp)
[LMStudioService] ✅ Connected to http://localhost:1234/v1
[LMStudioService] Requesting .../chat/completions (CapacitorHttp)
[LMStudioService] CapacitorHttp response status: 200
```

**Et dans LM Studio**:
```
POST /v1/chat/completions
Status: 200 OK
```

---

**Si tous les tests passent** ✅ : La correction est fonctionnelle !
**Si un test échoue** ❌ : Consulter la section Dépannage ci-dessus
