# 📱 Guide de Connexion Mobile - LM Studio

Si vos messages n'arrivent pas à LM Studio depuis l'application mobile, suivez ce guide.

## Le Problème
Par défaut, `localhost` sur votre téléphone correspond au téléphone lui-même, pas à votre PC. Il faut donc dire à l'application où trouver LM Studio.

## ✅ Solution 1 : Utiliser l'IP du PC (Recommandé)
Cette méthode est la plus fiable et fonctionne en WiFi (sans câble USB).

### Étape 1 : Configurer LM Studio
1. Ouvrez **LM Studio**.
2. Allez dans l'onglet **Local Server** (double flèche `<->`).
3. Dans les options à droite (Server Options) :
   - Cochez **Enable CORS** (Cross-Origin Resource Sharing).
   - **IMPORTANT** : Changez "Port Forwarding" ou "Network Interface" pour écouter sur toutes les interfaces (`0.0.0.0`) ou activez **"Serve on Local Network"**.
   - Le serveur doit indiquer qu'il écoute sur `http://0.0.0.0:1234` ou votre IP locale.

### Étape 2 : Trouver votre IP Locale
1. Sur votre PC Windows, ouvrez un terminal (PowerShell ou CMD).
2. Tapez `ipconfig`.
3. Notez l'adresse **IPv4** de votre carte WiFi ou Ethernet (ex: `192.168.1.45`).

### Étape 3 : Configurer l'Application Mobile
1. Ouvrez le fichier `src/config/networkConfig.ts` dans le projet.
2. Modifiez la ligne suivante avec votre IP :
   ```typescript
   const MOBILE_LM_STUDIO_HOST = '192.168.1.45'; // Mettez VOTRE IP ici
   ```
3. Reconstruisez l'application :
   ```bash
   pnpm build
   cd apps/mobile
   npx cap sync android
   npx cap run android
   ```

---

## 🔄 Solution 2 : ADB Reverse (Si vous gardez 'localhost')
Si vous voulez garder `localhost` dans la config (ex: vous changez souvent de réseau), vous devez utiliser le câble USB et ADB.

1. Assurez-vous que votre téléphone est branché en USB (ou émulateur lancé).
2. Lancez cette commande dans le terminal :
   ```bash
   adb reverse tcp:1234 tcp:1234
   ```
3. **Vérification** : Cette commande ne renvoie rien si elle réussit. Si elle échoue, vérifiez vos drivers ADB.
4. Cette commande doit être relancée si vous débranchez le téléphone.

## 🛠️ Dépannage
- **Pare-feu Windows** : Vérifiez que le pare-feu ne bloque pas le port 1234 pour les connexions entrantes (Node.js / LM Studio).
- **Même Wifi** : Le téléphone et le PC doivent être sur le même réseau Wifi pour la Solution 1.
- **Logcat** : Pour voir les erreurs, utilisez Android Studio Logcat et filtrez sur "Web Console" ou "ChatInputMobile".
