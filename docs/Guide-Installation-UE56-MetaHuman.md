# Guide d'Installation et Configuration - Unreal Engine 5.6 + MetaHuman pour Lisa

## 📋 Table des Matières

1. [Prérequis Système](#prérequis-système)
2. [Installation d'Unreal Engine 5.6](#installation-dunreal-engine-56)
3. [Configuration MetaHuman](#configuration-metahuman)
4. [Création du Projet UE](#création-du-projet-ue)
5. [Configuration des Plugins](#configuration-des-plugins)
6. [Import MetaHuman](#import-metahuman)
7. [Configuration WebSocket](#configuration-websocket)
8. [Intégration avec Lisa](#intégration-avec-lisa)
9. [Tests et Validation](#tests-et-validation)
10. [Dépannage](#dépannage)

---

## 🖥️ Prérequis Système

### Configuration Minimale
- **OS** : Windows 10/11 (64-bit)
- **RAM** : 16 GB minimum, 32 GB recommandé
- **GPU** : DirectX 12 compatible, 8 GB VRAM minimum
- **Stockage** : 150 GB d'espace libre (SSD recommandé)
- **CPU** : Intel i7-8700K / AMD Ryzen 7 2700X ou supérieur

### Configuration Recommandée
- **RAM** : 64 GB
- **GPU** : RTX 4070 / RTX 3080 ou supérieur
- **Stockage** : 500 GB SSD NVMe
- **CPU** : Intel i9-12900K / AMD Ryzen 9 5900X ou supérieur

---

## 🚀 Installation d'Unreal Engine 5.6

### Étape 1 : Epic Games Launcher

1. **Télécharger Epic Games Launcher**
   ```
   https://www.epicgames.com/store/download
   ```

2. **Créer un compte Epic Games** (si nécessaire)
   - Rendez-vous sur https://www.epicgames.com/
   - Créez un compte développeur gratuit

3. **Installer Epic Games Launcher**
   - Exécuter le fichier téléchargé
   - Suivre les instructions d'installation

### Étape 2 : Installation UE 5.6

1. **Ouvrir Epic Games Launcher**
2. **Aller dans l'onglet "Unreal Engine"**
3. **Cliquer sur "Install Engine"**
4. **Sélectionner la version 5.6.x** (dernière disponible)
5. **Choisir les composants** :
   ```
   ✅ Core Components
   ✅ Starter Content
   ✅ Templates and Feature Packs
   ✅ Engine Source (optionnel, pour développement avancé)
   ✅ Debug Symbols (optionnel, pour débogage)
   ```

6. **Définir le répertoire d'installation**
   ```
   Recommandé : C:\Program Files\Epic Games\UE_5.6
   ```

7. **Lancer l'installation** (peut prendre 1-2 heures)

### Étape 3 : Vérification de l'Installation

1. **Lancer Unreal Engine 5.6**
2. **Créer un projet test** :
   - Template : "Third Person"
   - Target Platform : "Desktop"
   - Quality Preset : "Maximum"
   - Raytracing : "Enabled"

3. **Vérifier les fonctionnalités** :
   - Lumen fonctionne (éclairage dynamique)
   - Nanite activé (géométrie virtualisée)
   - Compilation réussie

---

## 👤 Configuration MetaHuman

### Étape 1 : Accès MetaHuman Creator

1. **Ouvrir le navigateur web**
2. **Aller sur** : https://metahuman.unrealengine.com/
3. **Se connecter avec le compte Epic Games**
4. **Accepter les conditions d'utilisation**

### Étape 2 : Création d'un MetaHuman

1. **Choisir un preset** ou **créer from scratch**
2. **Personnaliser l'apparence** :
   - Forme du visage
   - Couleur des yeux
   - Coiffure
   - Couleur de peau
   - Vêtements

3. **Nommer votre MetaHuman** : `Lisa_Avatar_01`
4. **Sauvegarder dans votre bibliothèque**

### Étape 3 : Export vers Unreal Engine

1. **Sélectionner votre MetaHuman**
2. **Cliquer sur "Download"**
3. **Choisir "Unreal Engine Project"**
4. **Sélectionner la qualité** : "High" ou "Cinematic"
5. **Confirmer le téléchargement**

---

## 🎮 Création du Projet UE

### Étape 1 : Nouveau Projet

1. **Ouvrir Unreal Engine 5.6**
2. **Cliquer sur "New Project"**
3. **Sélectionner "Games"**
4. **Choisir "Third Person" template**
5. **Configurer le projet** :
   ```
   Project Name: Lisa_MetaHuman_Project
   Location: C:\Users\[username]\Documents\Unreal Projects\
   Blueprint/C++: Blueprint (recommandé pour débuter)
   Target Platform: Desktop
   Quality Preset: Maximum
   Raytracing: Enabled
   Starter Content: Yes
   ```

6. **Cliquer sur "Create"**

### Étape 2 : Configuration Initiale

1. **Attendre le chargement complet**
2. **Vérifier les paramètres du projet** :
   - Edit → Project Settings
   - Engine → Rendering
   - ✅ Lumen Global Illumination
   - ✅ Lumen Reflections
   - ✅ Nanite

---

## 🔌 Configuration des Plugins

### Étape 1 : Plugins Essentiels

1. **Ouvrir Edit → Plugins**
2. **Activer les plugins suivants** :

   **MetaHuman & Animation**
   ```
   ✅ MetaHuman
   ✅ Control Rig
   ✅ IK Rig
   ✅ Animation Blueprint
   ✅ Live Link
   ```

   **Networking & Communication**
   ```
   ✅ Web Socket Networking
   ✅ HTTP
   ✅ JSON
   ```

   **Audio & Media**
   ```
   ✅ MetaSounds
   ✅ Audio Synesthesia
   ✅ Media Framework
   ```

   **Rendering & Effects**
   ```
   ✅ Chaos Physics
   ✅ Niagara
   ✅ Movie Render Queue
   ```

3. **Redémarrer l'éditeur** quand demandé

### Étape 2 : Configuration WebSocket

1. **Créer un nouveau Blueprint** :
   - Content Browser → Add → Blueprint Class
   - Parent Class : "Actor"
   - Name : `BP_WebSocketManager`

2. **Ajouter le code WebSocket** (voir section suivante)

---

## 📥 Import MetaHuman

### Étape 1 : Via Quixel Bridge

1. **Ouvrir Window → Quixel Bridge**
2. **Se connecter avec le compte Epic Games**
3. **Aller dans l'onglet "MetaHumans"**
4. **Sélectionner votre MetaHuman créé**
5. **Cliquer sur "Download"**
6. **Attendre le téléchargement et l'import**

### Étape 2 : Vérification de l'Import

1. **Aller dans Content Browser**
2. **Naviguer vers** : `Content/MetaHumans/[NomDuMetaHuman]/`
3. **Vérifier la présence des dossiers** :
   ```
   📁 Body/
   📁 Face/
   📁 Hair/
   📁 BP_[NomDuMetaHuman]  (Blueprint principal)
   ```

### Étape 3 : Test du MetaHuman

1. **Glisser-déposer** `BP_[NomDuMetaHuman]` dans la scène
2. **Compiler et sauvegarder**
3. **Lancer le jeu** (Play button)
4. **Vérifier** :
   - Le MetaHuman s'affiche correctement
   - Les animations fonctionnent
   - L'éclairage Lumen est appliqué

---

## 🌐 Configuration WebSocket

### Étape 1 : Blueprint WebSocket Manager

1. **Ouvrir** `BP_WebSocketManager`
2. **Ajouter les variables** :
   ```
   WebSocket (WebSocket Reference)
   ServerURL (String) = "ws://localhost:8080/metahuman"
   IsConnected (Boolean) = false
   ```

3. **Event BeginPlay** :
   ```
   Create WebSocket → Set WebSocket
   Bind Event to OnConnected
   Bind Event to OnMessage
   Connect to Server (ServerURL)
   ```

### Étape 2 : Gestion des Messages

1. **OnMessage Event** :
   ```
   Parse JSON Message
   Switch on Message Type:
     - "expression" → Set Facial Expression
     - "speech" → Play Speech Animation
     - "pose" → Set Body Pose
     - "lumen" → Configure Lumen Settings
     - "nanite" → Configure Nanite Settings
     - "chaos" → Configure Physics
     - "metasound" → Play MetaSound
   ```

### Étape 3 : Fonctions de Contrôle

Créer les fonctions suivantes dans le Blueprint :

**SetFacialExpression**
```
Input: Expression Name (String), Intensity (Float)
→ Get MetaHuman Face Component
→ Set Blend Shape Weight
```

**ConfigureLumen**
```
Input: Quality (String), GI Enabled (Bool)
→ Get Rendering Settings
→ Set Lumen Quality Level
→ Set Global Illumination
```

**ConfigureNanite**
```
Input: Enabled (Bool), Max Triangles (Int)
→ Get Nanite Settings
→ Set Nanite Enabled
→ Set Triangle Budget
```

---

## 🔗 Intégration avec Lisa

### Étape 1 : Démarrage du Serveur UE

1. **Placer** `BP_WebSocketManager` dans la scène
2. **Compiler et sauvegarder le projet**
3. **Lancer le jeu en mode Standalone** :
   ```
   Play → Standalone Game
   ```

### Étape 2 : Configuration Lisa

1. **Ouvrir le projet Lisa**
2. **Vérifier la configuration WebSocket** dans `UnrealEngineService.ts` :
   ```typescript
   private readonly defaultEndpoint = 'ws://localhost:8080/metahuman';
   ```

3. **Importer le composant de contrôle** :
   ```typescript
   import { MetaHumanUE56Controls } from './components/MetaHumanUE56Controls';
   ```

### Étape 3 : Test de Connexion

1. **Démarrer Lisa** :
   ```bash
   npm run dev
   ```

2. **Ouvrir l'interface Lisa**
3. **Naviguer vers les contrôles MetaHuman**
4. **Cliquer sur "Connect"**
5. **Vérifier le statut** : "Connecté" doit apparaître

---

## ✅ Tests et Validation

### Test 1 : Connexion WebSocket

```typescript
// Dans la console développeur de Lisa
const { connect } = useUnrealEngine();
await connect();
// Doit retourner true
```

### Test 2 : Expression Faciale

```typescript
const { setExpression } = useUnrealEngine();
setExpression({
  name: 'joy',
  intensity: 0.8,
  duration: 2000
});
```

### Test 3 : Lumen

```typescript
const { configureLumen } = useUnrealEngine();
configureLumen({
  globalIllumination: true,
  reflections: true,
  quality: 'high'
});
```

### Test 4 : Speech

```typescript
const { speak } = useUnrealEngine();
speak({
  text: "Bonjour, je suis Lisa avec Unreal Engine 5.6",
  audioUrl: "/path/to/audio.wav"
});
```

---

## 🔧 Dépannage

### Problème : WebSocket ne se connecte pas

**Solutions** :
1. Vérifier que UE est lancé en mode Standalone
2. Vérifier le port 8080 (Windows Firewall)
3. Redémarrer UE et Lisa
4. Vérifier les logs UE : Window → Developer Tools → Output Log

### Problème : MetaHuman ne s'affiche pas

**Solutions** :
1. Vérifier l'import complet via Quixel Bridge
2. Recompiler tous les Blueprints
3. Vérifier les paramètres de rendu (Lumen/Nanite)
4. Redémarrer l'éditeur

### Problème : Performances faibles

**Solutions** :
1. Réduire la qualité Lumen : Medium au lieu de High
2. Limiter les triangles Nanite : 1M au lieu de 5M
3. Désactiver les fonctionnalités non utilisées
4. Vérifier les pilotes GPU

### Problème : Audio ne fonctionne pas

**Solutions** :
1. Vérifier que MetaSounds est activé
2. Importer les fichiers audio en format WAV
3. Configurer les paramètres audio du projet
4. Tester avec un MetaSound simple

---

## 📚 Ressources Supplémentaires

### Documentation Officielle
- [Unreal Engine 5.6 Documentation](https://docs.unrealengine.com/5.6/)
- [MetaHuman Creator Guide](https://docs.unrealengine.com/5.6/metahuman-creator/)
- [Lumen Documentation](https://docs.unrealengine.com/5.6/lumen-global-illumination/)
- [Nanite Documentation](https://docs.unrealengine.com/5.6/nanite-virtualized-geometry/)

### Tutoriels Vidéo
- [MetaHuman in UE5.6 - Complete Setup](https://www.youtube.com/epicgames)
- [Lumen Lighting Masterclass](https://www.youtube.com/unrealengine)
- [WebSocket Communication in UE5](https://www.youtube.com/unrealengine)

### Communauté
- [Unreal Engine Discord](https://discord.gg/unrealengine)
- [MetaHuman Community Forum](https://forums.unrealengine.com/c/metahuman/)
- [Reddit r/unrealengine](https://reddit.com/r/unrealengine)

---

## 🎯 Prochaines Étapes

Une fois l'installation terminée :

1. **Expérimenter avec les contrôles Lisa**
2. **Créer des animations personnalisées**
3. **Optimiser les performances pour votre matériel**
4. **Explorer les fonctionnalités avancées** (Chaos Physics, MetaSounds)
5. **Intégrer avec d'autres systèmes Lisa** (AI, TTS, etc.)

---

**🎉 Félicitations ! Votre installation UE 5.6 + MetaHuman pour Lisa est maintenant prête !**

Pour toute question ou problème, consultez la section dépannage ou contactez le support technique.
