# Contexte du Projet : Lisa

Ce document sert de guide pour les assistants IA et les développeurs travaillant sur le projet Lisa. Il décrit l'architecture, les conventions et les concepts fondamentaux du projet.

## 1. Vue d'ensemble du Projet

Lisa est une application web intelligente et interactive conçue comme un assistant personnel. Elle intègre des fonctionnalités d'IA avancées, notamment :
- Le traitement du langage naturel pour la compréhension des intentions.
- La reconnaissance vocale (wake word, commandes vocales).
- La vision par ordinateur (reconnaissance de gestes, d'objets).
- Un système de workflow dynamique permettant de créer et d'exécuter des tâches complexes.

L'application est composée d'un frontend en React et d'un backend en Express.js.

## 2. Stack Technique

- **Langage** : TypeScript
- **Frontend** :
  - **Framework** : React 19
  - **Build Tool** : Vite
  - **Gestion d'état** : Zustand
  - **Routing** : (Non spécifié, probablement géré par la logique applicative)
  - **Styling** : CSS standard, Emotion (`@emotion/styled`)
  - **UI Components** : Material-UI (`@mui/material`)
- **Backend** :
  - **Framework** : Express.js
  - **Base de données** : Base de données SQL gérée via l'ORM Prisma.
- **Tests** : Vitest
- **Linting** : ESLint

## 3. Structure du Projet

Le code source principal se trouve dans le dossier `src/`.

- `src/`
  - `main.tsx`: Point d'entrée de l'application React.
  - `App.tsx`: Composant principal de l'application.
  - `components/`: Composants React réutilisables (UI).
  - `hooks/`: Hooks React personnalisés, qui contiennent une grande partie de la logique du frontend.
  - `store/`: Définitions des stores Zustand pour la gestion d'état globale.
  - `pages/` (ou structure similaire) : Composants représentant les différentes vues/pages de l'application.
  - `services/`: Services pour la communication avec des API externes ou la logique métier.
  - `utils/`: Fonctions utilitaires génériques.
  - `types/`: Définitions des types TypeScript globaux.
  - `i18n.ts` & `locales/`: Configuration de l'internationalisation (i18next).

### Dossiers Spécifiques à l'IA

- `src/agents/`: **(CRUCIAL)** Contient la logique des différents "agents" IA. Chaque agent est spécialisé dans une tâche (ex: `WebSearchAgent`, `CodeInterpreterAgent`, `MetaHumanAgent`). C'est le cerveau de l'application.
- `src/workflow/`: **(CRUCIAL)** Contient tout ce qui est lié au système de workflows. Utilise `reactflow` pour l'interface visuelle. Comprend les `nodes` (nœuds), les `panels` de configuration et l'exécuteur de workflow (`WorkflowExecutor`).
- `src/tools/`: Outils réutilisables que les agents peuvent utiliser pour effectuer des actions concrètes (ex: lire une page web, exécuter une recherche).
- `src/hooks/use...`: De nombreux hooks sont dédiés à l'IA, comme `useIntentHandler`, `useWakeWord`, `useUserWorkflows`.

### Dossiers Spécifiques à MetaHuman

- `src/components/MetaHumanCanvas.tsx`: Composant React pour le rendu 3D du MetaHuman.
- `src/components/ModelLoader.tsx`: Gère le chargement des modèles 3D (GLTF).
- `src/components/MetaHumanControlsPanel.tsx`: Panneau de contrôle UI pour interagir avec le MetaHuman.
- `src/store/metaHumanStore.ts`: Store Zustand pour gérer l'état du MetaHuman (expressions, poses, animations).

### Dossier Backend

- `src/api/`: Contient le code du serveur backend Express.
  - `server.ts` ou `index.ts`: Point d'entrée du serveur.
  - `routes/`: Définition des routes de l'API.
  - `controllers/`: Logique de gestion des requêtes.
  - `middleware/`: Middlewares Express (ex: authentification).
  - `services/`: Logique métier côté serveur.

- `prisma/`: Contient le schéma de la base de données (`schema.prisma`) et les migrations.

## 4. Concepts Fondamentaux

### Le Modèle "Agent"

L'architecture repose sur un ensemble d'agents spécialisés. Un agent est une unité de logique autonome qui peut comprendre une requête, utiliser des outils pour collecter des informations ou effectuer des actions, et produire un résultat. C'est un concept central à comprendre avant de modifier le code.

### Le Moteur de Workflow

Le système de workflow permet de chaîner des actions (potentiellement exécutées par des agents) de manière visuelle et dynamique. L'utilisateur ou le système peut construire des workflows pour automatiser des tâches. Le dossier `src/workflow` est le point de départ pour comprendre cette logique.

## 5. Conventions de Développement

- **Style de code** : Suivre les règles définies dans `.eslintrc.cjs`. Lancer `npm run lint` pour vérifier.
- **Tests** : Tout nouveau code doit être accompagné de tests unitaires ou d'intégration. Lancer `npm run test`.
- **Commits** : Utiliser des messages de commit clairs et descriptifs (ex: `feat: add user authentication`, `fix: resolve bug in workflow executor`).
- **Variables d'environnement** : Ne jamais commiter de secrets. Utiliser le fichier `.env` pour le développement local et s'assurer que `.env` est dans `.gitignore`. Le fichier `.env.example` sert de modèle.

### Intégration Robotique (ROS)

Lisa peut être étendue pour contrôler des robots via ROS (Robot Operating System).

- **Agent Robotique** : `src/agents/RobotAgent.ts` est l'agent principal pour interagir avec le système ROS. Il utilise `roslibjs` pour la communication.
- **Service ROS** : `src/services/RosService.ts` gère la connexion WebSocket avec `rosbridge_suite` et fournit des méthodes de publication/souscription aux topics ROS et d'appel de services ROS.
- **Configuration** : L'URL du ROS Bridge (`ws://localhost:9090` par défaut) doit être configurable via une variable d'environnement pour permettre la connexion à différents systèmes robotiques.
- **Types de Messages/Services ROS** : Les types de messages et de services ROS utilisés par le `RobotAgent` (ex: `geometry_msgs/Twist`, `my_robot_msgs/PickUpObject`) doivent correspondre aux définitions réelles du système ROS cible.

details pour le RosAgent :

1. **Créer un agent “RosAgent”** qui utilise la librairie NPM **roslib** :
   - Se connecte à un rosbridge WebSocket (`url`).
   - Modes : `publish`, `subscribe` (une seule valeur), `service`.
   - Paramètres :  
     ```ts
     interface RosAgentParams {
       url: string;
       topic: string;
       messageType: string;
       mode: 'publish' | 'subscribe' | 'service';
       payload?: Record<string, any>;
       timeout?: number;   // ms, défaut 5000
     }
     ```
   - Retour : JSON du message reçu (subscribe/service) OU `{ ok: true }` (publish).
   - Gestion : timeout, erreurs connexion, unsubscribe automatique.

2. **Enregistrer l’agent** dans `AgentRegistry` sous la clé `"RosAgent"`.

3. **Créer un nœud React-Flow “RosNode”** (`rosTopic`) :
   - Affiche `mode.toUpperCase()` + `topic`.
   - Deux handles : `target` gauche, `source` droite.
   - Props `data` = `RosAgentParams`.
   - Ajouter dans `nodeRegistry`.

4. **Brancher l’exécution** dans `WorkflowExecutor.ts` :
   ```ts
   case 'rosTopic':
     return agentRegistry.execute('RosAgent', node.data);

Ce document doit être maintenu à jour à mesure que le projet évolue.