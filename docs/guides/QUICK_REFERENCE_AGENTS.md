# 🚀 Quick Reference - Agent Registry

**Version:** 2.0 | **Date:** 4 Novembre 2025

---

## 📦 Installation

```typescript
import { agentRegistry } from './agents/registry';
```

---

## 🔧 API Rapide

### Méthodes Principales

```typescript
// Synchrone (agent déjà chargé)
const agent = agentRegistry.getAgent('AgentName');

// Asynchrone (charge si nécessaire) ⭐ Recommandé
const agent = await agentRegistry.getAgentAsync('AgentName');

// Précharger agents spécifiques
await agentRegistry.preloadAgents(['Agent1', 'Agent2']);

// Précharger tous les agents
await agentRegistry.preloadAllAgents();

// Lister agents disponibles
const names = agentRegistry.listAvailableAgentNames();

// Obtenir tous les agents chargés
const agents = agentRegistry.getAllAgents();
```

---

## 💡 Exemples Rapides

### Utilisation Basique

```typescript
// Charger et utiliser un agent
const agent = await agentRegistry.getAgentAsync('VisionAgent');
if (agent) {
  const result = await agent.execute({
    input: 'Analyze image',
    context: {}
  });
}
```

### Préchargement au Démarrage

```typescript
// Dans App.tsx
useEffect(() => {
  agentRegistry.preloadAgents([
    'PlannerAgent',
    'VisionAgent',
    'MemoryAgent'
  ]);
}, []);
```

### Hook React

```typescript
const useAgent = (agentName: string) => {
  const [agent, setAgent] = useState(null);
  
  useEffect(() => {
    agentRegistry.getAgentAsync(agentName)
      .then(setAgent);
  }, [agentName]);
  
  return agent;
};
```

---

## 📋 Liste des 46 Agents

### Communication (7)
- `AudioAnalysisAgent` - Analyse audio
- `EmailAgent` - Gestion emails
- `HearingAgent` - Reconnaissance vocale
- `MetaHumanAgent` - Avatar 3D
- `SmallTalkAgent` - Conversation casual
- `SpeechSynthesisAgent` - Synthèse vocale
- `TranslationAgent` - Traduction

### Perception (4)
- `VisionAgent` - Vision par ordinateur
- `OCRAgent` - Reconnaissance texte
- `ImageAnalysisAgent` - Analyse d'images
- `ScreenShareAgent` - Partage d'écran

### Productivité (8)
- `CalendarAgent` - Calendrier
- `TodoAgent` - Tâches
- `SchedulerAgent` - Planification
- `MemoryAgent` - Mémoire
- `KnowledgeGraphAgent` - Graphe de connaissances
- `ContentGeneratorAgent` - Génération contenu
- `WebContentReaderAgent` - Lecture web
- `WebSearchAgent` - Recherche web

### Développement (4)
- `CodeInterpreterAgent` - Interpréteur code
- `GeminiCodeAgent` - Code avec Gemini
- `GeminiCliAgent` - CLI Gemini
- `GitHubAgent` - Intégration GitHub

### Analyse (3)
- `DataAnalysisAgent` - Analyse données
- `NLUAgent` - Compréhension langage
- `PersonalizationAgent` - Personnalisation

### Intégration (8)
- `SystemIntegrationAgent` - Intégration système
- `RobotAgent` - Contrôle robot
- `RosAgent` - ROS integration
- `RosPublisherAgent` - ROS publisher
- `MQTTAgent` - MQTT
- `SmartHomeAgent` - Domotique
- `PowerShellAgent` - PowerShell
- `WeatherAgent` - Météo

### Workflow (8)
- `PlannerAgent` - Planification workflows
- `TriggerAgent` - Déclencheurs
- `TransformAgent` - Transformations
- `ConditionAgent` - Conditions
- `DelayAgent` - Délais
- `WorkflowHTTPAgent` - HTTP workflows
- `WorkflowCodeAgent` - Code workflows
- `UserWorkflowAgent` - Workflows utilisateur

### Sécurité & Monitoring (4)
- `SecurityAgent` - Sécurité
- `HealthMonitorAgent` - Monitoring santé
- `ProactiveSuggestionsAgent` - Suggestions
- `ContextAgent` - Gestion contexte

---

## ⚡ Patterns Recommandés

### Pattern 1: Lazy Loading (Recommandé)

```typescript
const agent = await agentRegistry.getAgentAsync('AgentName');
```

**Avantages:** Charge à la demande, réduit bundle initial

### Pattern 2: Préchargement Critique

```typescript
// Au démarrage
await agentRegistry.preloadAgents([
  'PlannerAgent',
  'NLUAgent',
  'MemoryAgent'
]);
```

**Avantages:** Agents critiques disponibles immédiatement

### Pattern 3: Préchargement par Domaine

```typescript
// Perception
await agentRegistry.preloadAgents([
  'VisionAgent',
  'HearingAgent',
  'OCRAgent'
]);

// Workflow
await agentRegistry.preloadAgents([
  'PlannerAgent',
  'TriggerAgent',
  'TransformAgent'
]);
```

**Avantages:** Optimise pour cas d'usage spécifiques

---

## 🎯 Agents Critiques par Cas d'Usage

### Assistant Vocal
```typescript
await agentRegistry.preloadAgents([
  'HearingAgent',
  'NLUAgent',
  'PlannerAgent',
  'SpeechSynthesisAgent',
  'SmallTalkAgent'
]);
```

### Vision & Perception
```typescript
await agentRegistry.preloadAgents([
  'VisionAgent',
  'OCRAgent',
  'ImageAnalysisAgent',
  'AudioAnalysisAgent'
]);
```

### Productivité
```typescript
await agentRegistry.preloadAgents([
  'CalendarAgent',
  'TodoAgent',
  'SchedulerAgent',
  'MemoryAgent',
  'EmailAgent'
]);
```

### Développement
```typescript
await agentRegistry.preloadAgents([
  'CodeInterpreterAgent',
  'GeminiCodeAgent',
  'GitHubAgent',
  'PowerShellAgent'
]);
```

### Robotique
```typescript
await agentRegistry.preloadAgents([
  'RobotAgent',
  'RosAgent',
  'RosPublisherAgent',
  'VisionAgent'
]);
```

### Workflows
```typescript
await agentRegistry.preloadAgents([
  'PlannerAgent',
  'TriggerAgent',
  'TransformAgent',
  'ConditionAgent',
  'DelayAgent',
  'WorkflowHTTPAgent',
  'WorkflowCodeAgent'
]);
```

---

## 📊 Performance

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| Bundle initial | ~5 MB | ~1.1 MB | -78% |
| Temps démarrage | ~3s | ~0.6s | -80% |
| Agents chargés | 46 | 0-46 | À la demande |

---

## ⚠️ À Éviter

```typescript
// ❌ Précharger tous les agents sans raison
await agentRegistry.preloadAllAgents();

// ❌ Utiliser getAgent() sans vérifier
const agent = agentRegistry.getAgent('Agent');
agent.execute(); // Peut crasher si undefined

// ❌ Charger le même agent plusieurs fois
await agentRegistry.getAgentAsync('Agent');
await agentRegistry.getAgentAsync('Agent'); // Inutile
```

---

## ✅ Bonnes Pratiques

```typescript
// ✅ Toujours vérifier si agent existe
const agent = await agentRegistry.getAgentAsync('Agent');
if (!agent) return;

// ✅ Précharger agents critiques au démarrage
useEffect(() => {
  agentRegistry.preloadAgents(['Critical1', 'Critical2']);
}, []);

// ✅ Lazy load agents secondaires
const handleFeature = async () => {
  const agent = await agentRegistry.getAgentAsync('SecondaryAgent');
  // ...
};
```

---

## 🔗 Liens Utiles

- **Audit Complet:** `AUDIT_NOVEMBRE_2025.md`
- **Guide Migration:** `MIGRATION_GUIDE_REGISTRY.md`
- **Code Source:** `src/agents/registry.ts`

---

**Dernière mise à jour:** 4 Novembre 2025
