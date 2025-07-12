# Prochaines étapes pour Lisa

## 1. Intégration Agenda (Google Calendar)
1. Créer un projet sur Google Cloud Console et activer l’API Calendar.
2. Générer un OAuth 2.0 Client ID (type : Web).
3. Ajouter http://localhost:5173 comme URI de redirection.
4. Implémenter un flow OAuth implicite :
   - Bouton « Connecter Google » qui ouvre la fenêtre d’authentification.
   - Stocker le `access_token` dans `localStorage`.
5. Créer le hook `useGoogleCalendar` (fetch events, add event, set reminder).
6. Étendre `useVoiceIntent` :
   - « Quel est mon agenda aujourd’hui ? » → liste vocale.
   - « Ajoute réunion demain 15 h projet Lisa » → création API.
7. Scheduler : rappel vocal 5 min avant un événement.

## 2. To-Do list vocale
1. Ajouter `todos[]` dans le store (persist).
2. Commandes vocales :
   - « Ajoute <item> à ma liste »
   - « Lis ma liste »
   - « Supprime <item> »
3. Composant `TodoPanel` affichant la liste + boutons delete.
4. Feedback vocal après chaque action.

## 3. Alarmes avancées
1. Ajouter prise en charge des notifications système (API Notifications) en plus du TTS.
2. Sons personnalisés (balise `<audio>` cachée) selon alarme/minuteur.
3. Possibilité de définir une étiquette : « Alarm every weekday at 8 : réveil ».
4. Voix douce par défaut (« chéri/ma chérie ») paramétrable dans le store.

## 4. Tests & Qualité
1. Vitest : tests pour `useAlarmTimerScheduler`, `useGoogleCalendar`, gestion des tous & intents.
2. ESLint : activer `@typescript-eslint/no-explicit-any` en warn, corriger au fur et à mesure.

## 5. Déploiement & PWA
1. Ajouter `netlify.toml`, config build=`vite build`.
2. Ajouter manifeste PWA + service-worker via Vite PWA plugin.
3. Procéder au déploiement Netlify (site statique).
