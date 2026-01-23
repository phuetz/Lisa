# 🚀 Démarrage Rapide - Test Android

L'application a été buildée et synchronisée avec succès! Android Studio devrait s'ouvrir automatiquement.

---

## 📱 Étapes Suivantes

### 1. Configuration Réseau (IMPORTANT!)

Vous devez choisir une des deux options selon votre configuration:

#### Option A: Émulateur Android ou Appareil avec USB

Ouvrez un nouveau terminal et exécutez:
```bash
adb reverse tcp:1234 tcp:1234
```

Vérifiez que c'est actif:
```bash
adb reverse --list
```
Vous devriez voir: `tcp:1234 -> tcp:1234`

**Configuration**: Le fichier `src/config/networkConfig.ts` doit avoir:
```typescript
const MOBILE_LM_STUDIO_HOST = 'localhost'; // ← Laisser localhost
```

#### Option B: Appareil Physique (WiFi sans câble)

1. **Trouver l'IP de votre PC**:
   ```bash
   ipconfig
   ```
   Cherchez votre IPv4 (ex: `192.168.1.45`)

2. **Modifier la Configuration**:
   - Ouvrez `src/config/networkConfig.ts`
   - Ligne 22, changez:
     ```typescript
     const MOBILE_LM_STUDIO_HOST = '192.168.1.45'; // Votre IP
     ```

3. **Rebuild**:
   ```bash
   cd c:\Users\patri\CascadeProjects\Lisa
   pnpm build
   cd apps\mobile
   npx cap sync android
   ```

4. **LM Studio**:
   - Ouvrir LM Studio
   - Aller dans Local Server (onglet `<->`)
   - Activer **"Serve on Local Network"**
   - Vérifier qu'il écoute sur `0.0.0.0:1234`

---

### 2. Dans Android Studio

1. **Sélectionner un appareil**:
   - Émulateur: Choisir un émulateur dans la liste déroulante
   - Appareil physique: Brancher via USB et autoriser le debugging

2. **Lancer l'application**:
   - Cliquer sur le bouton ▶️ **Run** (ou Shift+F10)
   - Attendre que l'app se compile et s'installe (~1-2 min la première fois)

3. **Ouvrir Logcat** (pour voir les logs):
   - En bas de Android Studio: onglet **Logcat**
   - Filtrer sur: `Web Console` ou `LMStudioService`

---

### 3. Test de la Connexion

#### Logs Attendus au Démarrage

Dans **Logcat**, vous devriez voir:
```
[NetworkConfig] 📱 Mobile detected. Using LM Studio at: http://localhost:1234/v1
[NetworkConfig] 💡 If connection fails, check GUIDE_CONNEXION_MOBILE.md
[LMStudioService] Testing availability of http://localhost:1234/v1... (CapacitorHttp)
[LMStudioService] ✅ Connected to http://localhost:1234/v1
```

**✅ Si vous voyez `(CapacitorHttp)` et `✅ Connected`** → Tout est bon!

**❌ Si vous voyez des erreurs** → Vérifier:
1. LM Studio est démarré avec un modèle chargé?
2. Le serveur local est actif dans LM Studio?
3. ADB reverse est configuré (Option A)?
4. Ou l'IP est correcte (Option B)?

#### Test d'Envoi de Message

1. Dans l'app, allez dans l'interface de chat
2. Tapez: `Bonjour Lisa!`
3. Appuyez sur Envoyer

**Logs attendus**:
```
[LMStudioService] Requesting http://localhost:1234/v1/chat/completions (CapacitorHttp)
[LMStudioService] chatStream starting (mobile fallback)
[LMStudioService] CapacitorHttp response status: 200
```

**Dans LM Studio**, vous devriez voir:
```
POST /v1/chat/completions
Status: 200 OK
```

**Dans l'app**, la réponse de Lisa devrait apparaître (peut être d'un coup, c'est normal sur mobile).

---

## 🐛 Problèmes Fréquents

### Erreur: "Network Error" ou "Connection refused"

**Solution**:
1. Vérifier que LM Studio est démarré:
   ```bash
   curl http://localhost:1234/v1/models
   ```
2. Si émulateur, vérifier ADB reverse:
   ```bash
   adb reverse --list
   ```
3. Si appareil WiFi, vérifier que PC et téléphone sont sur le même réseau

### Logs montrent "(fetch)" au lieu de "(CapacitorHttp)"

**Cause**: L'app pense être en mode web

**Solution**:
```bash
# Vérifier que le build est à jour
ls dist/

# Re-sync
cd apps\mobile
npx cap sync android

# Relancer dans Android Studio
```

### Pas de logs dans Logcat

**Solution**:
- Cliquer sur le dropdown "No Filters" → "Show only selected application"
- Si rien n'apparaît, chercher "Web Console" dans le filtre de recherche

---

## 📊 Architecture de la Correction

```
┌─────────────────────────────────┐
│      Lisa Mobile (Android)      │
│  src/services/LMStudioService   │
│   ├─ isNative? → CapacitorHttp  │  ← NOUVELLE IMPLÉMENTATION
│   └─ !isNative? → fetch         │
└──────────────┬──────────────────┘
               │
               │ HTTP native (pas de CORS)
               │
               ▼
┌─────────────────────────────────┐
│     LM Studio sur PC Host       │
│   http://localhost:1234/v1      │
└─────────────────────────────────┘
```

---

## 📚 Documentation Complète

- **ANDROID_LM_STUDIO_FIX.md** : Explication technique détaillée
- **TEST_ANDROID_CONNECTION.md** : Guide de test complet avec checklist
- **GUIDE_CONNEXION_MOBILE.md** : Guide de configuration réseau

---

## ✅ Checklist Rapide

Avant de tester:
- [ ] LM Studio démarré avec modèle chargé
- [ ] Serveur local actif (onglet `<->` dans LM Studio)
- [ ] Option A: `adb reverse tcp:1234 tcp:1234` (émulateur)
- [ ] Option B: IP correcte dans `networkConfig.ts` + LM Studio en mode réseau local
- [ ] Android Studio ouvert avec projet chargé
- [ ] Émulateur lancé ou appareil connecté

Pendant le test:
- [ ] Logs montrent `Mobile detected` et `(CapacitorHttp)`
- [ ] Status `✅ Connected`
- [ ] Message envoyé avec status 200
- [ ] LM Studio reçoit la requête
- [ ] Réponse visible dans l'app

---

🎉 **Bonne chance avec le test!** Si vous rencontrez des problèmes, consultez les logs Logcat et comparez-les avec les logs attendus ci-dessus.
