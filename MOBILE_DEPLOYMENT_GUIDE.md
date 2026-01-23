# 📱 Guide de Déploiement Mobile Lisa

## 🚀 Lancement de l'Application Mobile

### Prérequis

```bash
# Vérifier que Capacitor est installé
npm list @capacitor/cli
npm list @capacitor/android
```

### Étapes de Déploiement

#### 1. Build de l'application

```bash
# Depuis la racine du projet
pnpm build
```

**Résultat attendu :**
```
✓ built in 12.52s
✓ dist/ folder created with web assets
```

#### 2. Synchronisation avec Android

```bash
# Navigation vers le dossier mobile
cd apps/mobile

# Synchronisation des assets web avec Android
./node_modules/.bin/cap sync android
```

**Résultat attendu :**
```
√ Copying web assets from dist to android\app\src\main\assets\public
√ Creating capacitor.config.json in android\app\src\main\assets
√ copy android in 122.29ms
√ Updating Android plugins in 2.70ms
√ update android in 68.85ms
√ Sync finished in 0.209s
```

#### 3. Lancement sur Émulateur Android

```bash
# Lancement sur l'émulateur Medium_Phone_API_35
./node_modules/.bin/cap run android --target=Medium_Phone_API_35
```

**Résultat attendu :**
```
√ Running Gradle build in 13.09s
√ Deploying app-debug.apk to Medium_Phone_API_35 in 2.97s
```

---

## 🎯 Vérification ChatGPT-like

### Points à vérifier sur l'émulateur

1. **Layout 3 zones :**
   - ✅ Header en haut avec menu burger
   - ✅ Messages scrollables au centre
   - ✅ Composer toujours visible au-dessus de la bottom nav

2. **Composer positionnement :**
   - ✅ Positionné au-dessus de la bottom navigation
   - ✅ Z-index correct (40 < 50 pour bottom nav)
   - ✅ Padding-bottom des messages évite l'overlap

3. **Navigation :**
   - ✅ Bottom navigation avec 5 icônes
   - ✅ Drawer overlay (70vw max 300px)
   - ✅ Safe areas support (notch)

---

## 🔧 Commandes Utiles

### Lister les émulateurs disponibles
```bash
cd apps/mobile
./node_modules/.bin/cap run android --list
```

### Lancer sur un autre émulateur
```bash
./node_modules/.bin/cap run android --target=NOM_EMULATEUR
```

### Debug USB
```bash
# Pour déployer sur un appareil physique
./node_modules/.bin/cap run android --external
```

---

## 📂 Structure des Fichiers

```
Lisa/
├── src/
│   ├── components/chat/
│   │   ├── ChatLayoutMobile.tsx     ← Layout principal
│   │   ├── ChatInputMobile.tsx      ← Zone de saisie
│   │   └── ChatMessagesMobile.tsx    ← Messages
│   ├── pages/
│   │   └── ChatPageMobile.tsx        ← Page mobile
│   └── routes.tsx                   ← Routing
├── apps/mobile/
│   ├── android/                      ← Projet Android
│   └── capacitor.config.ts          ← Config Capacitor
└── dist/                            ← Build web assets
```

---

## 🐛 Dépannage

### Build échoue
```bash
# Nettoyer et rebuild
pnpm clean
pnpm build
```

### Sync Android échoue
```bash
# Forcer la resynchronisation
cd apps/mobile
./node_modules/.bin/cap sync android --force
```

### Émulateur non trouvé
```bash
# Vérifier les émulateurs Android Studio
# ou utiliser AVD Manager
```

---

## 🎨 Design ChatGPT-like

### Variables CSS utilisées
```css
:root {
  --bottom-nav-height: 56px;
  --composer-height: 64px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}
```

### Z-index hierarchy
```
Bottom Navigation: z-index: 50
Composer: z-index: 40
Header: z-index: 40
Sidebar Overlay: z-index: 50
Sidebar Panel: z-index: 60
```

---

## ⚡ Performance

- **Build time** : ~12s
- **Sync time** : ~0.2s
- **Deploy time** : ~16s total
- **Bundle size** : Optimisé avec code splitting

---

*Guide créé pour faciliter le déploiement et les tests de l'application mobile Lisa avec design ChatGPT-like.*
