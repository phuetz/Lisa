# 🔧 Correction de la Communication Android → LM Studio

**Date**: 15 Janvier 2026
**Problème**: L'application Android ne communique pas avec LM Studio alors que la version web fonctionne
**Solution**: Implémentation de CapacitorHttp pour contourner les limitations CORS

---

## 📋 Résumé du Problème

L'application web Lisa utilise `fetch()` standard avec un proxy Vite (`/lmstudio/v1`) pour communiquer avec LM Studio. Cette approche fonctionne parfaitement en développement web, mais échoue sur Android pour deux raisons :

1. **Pas de proxy Vite** : Sur mobile, l'application est compilée et servie depuis `dist/`, il n'y a pas de serveur de développement
2. **Limitations CORS** : Les WebViews Android bloquent les requêtes HTTP cross-origin vers `localhost:1234`

## ✅ Solution Implémentée

### 1. Utilisation de CapacitorHttp

**Fichier modifié**: `src/services/LMStudioService.ts`

Le service a été mis à jour pour détecter automatiquement la plateforme et utiliser :
- **CapacitorHttp** sur mobile (Android/iOS) - contourne CORS nativement
- **fetch()** standard sur web - utilise le proxy Vite

#### Changements dans `makeRequest()`:
```typescript
private async makeRequest(endpoint: string, options: RequestInit): Promise<unknown> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // CapacitorHttp pour mobile - pas de CORS
    const response = await CapacitorHttp.request({
      url,
      method: options.method,
      headers: { 'Content-Type': 'application/json', ... },
      data: options.body ? JSON.parse(options.body) : undefined,
    });
    return response.data;
  } else {
    // fetch() pour web - utilise le proxy Vite
    const response = await fetch(url, options);
    return await response.json();
  }
}
```

### 2. Fallback Non-Streaming sur Mobile

**Problème**: CapacitorHttp ne supporte pas le streaming SSE (Server-Sent Events)

**Solution**: `chatStream()` détecte la plateforme :
- **Mobile**: Utilise `chat()` (requête complète) et simule le streaming
- **Web**: Utilise le vrai streaming SSE avec `ReadableStream`

```typescript
async *chatStream(messages: ChatMessage[]): AsyncGenerator<StreamChunk> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // Fallback : réponse complète d'un coup
    const fullResponse = await this.chat(messages);
    yield { content: fullResponse, done: false };
    yield { content: '', done: true };
    return;
  }

  // Web: streaming SSE classique
  const response = await fetch(...);
  // ... code streaming
}
```

### 3. Vérification de Disponibilité

La méthode `isAvailable()` a également été mise à jour pour utiliser CapacitorHttp sur mobile avec des timeouts appropriés.

---

## 📁 Fichiers Modifiés

| Fichier | Changements |
|---------|-------------|
| `src/services/LMStudioService.ts` | ✅ Ajout import CapacitorHttp<br>✅ `makeRequest()` avec détection plateforme<br>✅ `chatStream()` avec fallback mobile<br>✅ `isAvailable()` avec CapacitorHttp |
| `src/config/networkConfig.ts` | ✅ Déjà configuré (commit précédent) |
| `apps/mobile/android/.../network_security_config.xml` | ✅ Déjà configuré pour HTTP cleartext |
| `apps/mobile/capacitor.config.ts` | ✅ Déjà configuré avec `allowMixedContent` |

---

## 🚀 Déploiement et Test

### Étape 1: Rebuild l'application web
```bash
cd c:\Users\patri\CascadeProjects\Lisa
pnpm build
```

### Étape 2: Synchroniser avec Android
```bash
cd apps/mobile
npx cap sync android
```

### Étape 3: Ouvrir dans Android Studio
```bash
npx cap open android
```
*(Puis cliquer sur Run ▶️)*

### Configuration Réseau

#### Option A: Émulateur Android ou USB (ADB Reverse)
```bash
adb reverse tcp:1234 tcp:1234
```
**Fichier**: `src/config/networkConfig.ts`
```typescript
const MOBILE_LM_STUDIO_HOST = 'localhost'; // ← Laisser localhost
```

#### Option B: Appareil Physique (WiFi)
1. Trouvez l'IP de votre PC : `ipconfig` → IPv4 (ex: `192.168.1.45`)
2. **Fichier**: `src/config/networkConfig.ts`
   ```typescript
   const MOBILE_LM_STUDIO_HOST = '192.168.1.45'; // ← Votre IP
   ```
3. Dans LM Studio : Activer **"Serve on Local Network"** (0.0.0.0:1234)

---

## 🧪 Vérification

### Logs à surveiller (Logcat Android Studio)

Filtrer sur `Web Console` ou `LMStudioService` :

```
[NetworkConfig] 📱 Mobile detected. Using LM Studio at: http://localhost:1234/v1
[LMStudioService] Requesting http://localhost:1234/v1/chat/completions (CapacitorHttp)
[LMStudioService] CapacitorHttp response status: 200
```

### Tests à effectuer

1. ✅ **Test de connexion**
   - Envoyer un message simple : "Bonjour"
   - Vérifier que LM Studio affiche la requête dans ses logs
   - Vérifier que la réponse s'affiche dans le chat

2. ✅ **Test de disponibilité**
   - Observer l'indicateur de connexion dans l'UI
   - Doit afficher "Connecté" avec une latence en ms

3. ✅ **Test de fallback**
   - Sur mobile, le streaming sera simulé (réponse d'un coup)
   - C'est normal et attendu

---

## 🔍 Dépannage

### Problème: "Network Error" ou timeouts

**Causes possibles**:
1. LM Studio n'est pas démarré sur le PC
2. Mauvaise IP dans `networkConfig.ts` (si WiFi)
3. Pare-feu Windows bloque le port 1234
4. ADB reverse pas configuré (si émulateur)

**Solutions**:
```bash
# Vérifier ADB reverse
adb reverse --list

# Tester la connexion depuis l'émulateur
adb shell
curl http://10.0.2.2:1234/v1/models
```

### Problème: "CORS Error" encore présent

**Cause**: CapacitorHttp n'est pas utilisé

**Vérification**:
- Chercher dans Logcat : doit dire `(CapacitorHttp)` pas `(fetch)`
- Vérifier que `Capacitor.isNativePlatform()` retourne `true`

---

## 📊 Architecture Finale

```
┌─────────────────────────────────────────────────────┐
│                   Lisa Mobile App                   │
│                  (Android WebView)                  │
└────────────────────┬────────────────────────────────┘
                     │
                     │ CapacitorHttp.request()
                     │ (pas de CORS, requête native)
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│             LM Studio sur PC Host                   │
│          http://localhost:1234/v1                   │
│      (ou http://192.168.x.x:1234/v1 en WiFi)        │
└─────────────────────────────────────────────────────┘
```

---

## ✨ Différences Web vs Mobile

| Aspect | Web (dev) | Android |
|--------|-----------|---------|
| **HTTP Client** | `fetch()` | `CapacitorHttp` |
| **URL** | `/lmstudio/v1` (proxy) | `http://localhost:1234/v1` |
| **Streaming** | SSE natif | Fallback (non-streamé) |
| **CORS** | Géré par proxy Vite | Pas de CORS (requête native) |
| **Timeout** | `AbortSignal.timeout()` | `readTimeout/connectTimeout` |

---

## 📝 Notes Importantes

1. **Streaming simulé sur mobile**: C'est un compromis acceptable car la latence réseau locale est faible
2. **Logs verbeux**: Tous les logs `[LMStudioService]` et `[NetworkConfig]` aident au debugging
3. **Configuration réseau**: Le fichier `networkConfig.ts` est le point central de configuration
4. **Pas de changements UI**: L'interface utilisateur n'a pas besoin d'être modifiée

---

## ✅ Checklist de Validation

- [x] Code TypeScript compile sans erreurs
- [x] Import CapacitorHttp ajouté
- [x] Détection de plateforme fonctionnelle
- [x] Fallback streaming implémenté
- [x] Logs de debug ajoutés
- [ ] Test sur émulateur Android (à faire par l'utilisateur)
- [ ] Test sur appareil physique (à faire par l'utilisateur)
- [ ] Vérification des logs LM Studio (à faire par l'utilisateur)

---

**Prochaine étape**: Lancer `pnpm build && pnpm mobile:sync` puis tester sur Android 📱
