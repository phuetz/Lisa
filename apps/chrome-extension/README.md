# Lisa Chrome Extension

Extension Chrome pour Lisa - Contrôle autonome du navigateur.

## Installation

### Méthode 1: Mode développeur

1. Ouvrez Chrome et allez à `chrome://extensions/`
2. Activez le "Mode développeur" (en haut à droite)
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `apps/chrome-extension`

### Méthode 2: Packager l'extension

```bash
# Depuis la racine du projet
cd apps/chrome-extension
zip -r lisa-extension.zip . -x "*.md" -x "*.git*"
```

Puis installez le fichier `.zip` dans Chrome.

## Fonctionnalités

### Contrôle du Navigateur
- **Navigation** : Ouvrir des URLs, naviguer entre onglets
- **Click** : Cliquer sur des éléments par sélecteur ou coordonnées
- **Type** : Saisir du texte dans les champs
- **Scroll** : Faire défiler la page
- **Screenshot** : Capturer la page visible

### Intégration Lisa
- Connexion WebSocket au Gateway Lisa (port 18789)
- Envoi de screenshots pour analyse vision
- Réception de commandes depuis Lisa

### Raccourcis Clavier
- `Ctrl+Shift+L` : Ouvrir le popup Lisa
- `Ctrl+Shift+S` : Capturer l'écran et envoyer à Lisa

### Menu Contextuel
- Clic droit → "Analyser avec Lisa" : Envoyer le contenu sélectionné
- Clic droit → "Envoyer screenshot à Lisa" : Capturer la page

## Architecture

```
chrome-extension/
├── manifest.json     # Configuration extension (Manifest V3)
├── background.js     # Service worker - connexion Gateway
├── content.js        # Script injecté - interaction DOM
├── popup.html/js     # Interface popup
└── icons/            # Icônes extension
```

## Communication

### Extension → Lisa Gateway
```javascript
// Envoyer une action
sendToGateway({
  type: 'browser.screenshot',
  payload: { dataUrl, url, title }
});
```

### Lisa Gateway → Extension
```javascript
// Recevoir une commande
handleGatewayMessage({
  type: 'browser.click',
  payload: { selector: '#submit-btn' }
});
```

## Prérequis

- Lisa doit être en cours d'exécution (`pnpm dev`)
- Le Gateway doit écouter sur `ws://localhost:18789`

## Différences avec Claude Computer Use

| Fonctionnalité | Lisa Extension | Claude Plugin |
|----------------|----------------|---------------|
| Open Source | ✅ Oui | ❌ Non |
| Local-first | ✅ Oui | ❌ Cloud |
| Multi-provider | ✅ Gemini, GPT, Claude | ❌ Claude only |
| Vision intégrée | ✅ YOLOv8 local | ✅ Claude Vision |
| Customisable | ✅ Code modifiable | ❌ Fermé |
