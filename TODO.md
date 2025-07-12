# Lisa - Strategic Roadmap & TODO

## Vision

Evolve Lisa from a voice-command assistant into a proactive, agentic partner that rivals and surpasses platforms like Genspark and OpenManus. The goal is to create a highly intelligent, multi-modal, and extensible system built on a robust agentic architecture, while retaining its best-in-class voice-first user experience.

This roadmap is structured in three phases, moving from foundational architectural changes to advanced, differentiating features.

---

## Phase 1: The Agentic Core (Inspired by OpenManus)

**Objective:** Replace the rigid, rule-based intent parser with a flexible, agent-based orchestration system.

- [ ] **1.1: Introduce a Central `AgentRegistry`**
    - Create a central registry to manage and access all available agents.
    - This is the foundation for a modular and extensible system.

- [ ] **1.2: Refactor Existing Logic into `HandlerAgents`**
    - Convert existing functionalities into standalone, single-purpose agents.
    - **`WeatherAgent`**: Encapsulates all logic for fetching and displaying weather.
    - **`CalendarAgent`**: Manages all interactions with the Google Calendar API (listing, creating events).
    - **`TodoAgent`**: Handles all to-do list operations.

- [ ] **1.3: Implement a `PlannerAgent`**
    - This is the most critical step to move beyond simple commands.
    - This agent will replace the `parseIntent` function.
    - It will use a powerful LLM (like GPT-4 or Gemini) to understand natural language requests.
    - Based on the request, it will determine which `HandlerAgent` (or sequence of agents) to call from the `AgentRegistry`.
    - **Example:** The request "What's the weather like for my first meeting tomorrow?" would require the `PlannerAgent` to first call the `CalendarAgent` to find the meeting time and location, then call the `WeatherAgent` with that information.

- [ ] **1.4: Update Voice Hooks to use the `PlannerAgent`**
    - Modify `useVoiceIntent` to pass the user's speech directly to the `PlannerAgent` instead of the `parseIntent` function.

---

## Phase 2: Expanding Capabilities (Inspired by Genspark)

**Objective:** Broaden Lisa's skillset by giving agents the ability to use tools and understand multiple modalities.

- [ ] **2.1: Implement a `ToolBox` for Agents**
    - Create a collection of tools that agents can use.
    - **`WebSearchTool`**: Allow an agent to search the web for real-time information.
    - **`CodeInterpreterTool`**: A secure environment for an agent to run code (e.g., for calculations or data analysis), similar to OpenManus's `CodeInterpreterAgent`.

- [ ] **2.2: Develop a `WebSearchAgent`**
    - An agent that uses the `WebSearchTool` to answer questions that require up-to-date information.
    - **Example:** "What are the reviews for the new movie playing downtown?"

- [ ] **2.3: Introduce Multi-modal Agents**
    - Leverage the existing vision capabilities to create vision-based agents.
    - **`OCRAgent`**: Reads text from the screen or a selected area.
    - **`VisionAgent`**: Can describe what it sees from the webcam (e.g., "What object am I holding up?").

- [ ] **2.4: Develop a Simple Workflow Engine**
    - Enhance the `PlannerAgent` to execute multi-step plans (workflows).
    - This allows for complex tasks like, "Research the best local Italian restaurants, book a table for two for 8 PM tomorrow, and add it to my calendar."

---

## Phase 3: Proactive & Personalized Assistance

**Objective:** Make Lisa a truly intelligent partner that anticipates needs and learns from the user.

- [ ] **3.1: Implement Advanced Contextual Awareness**
    - Go beyond simple `lastUtterance` context.
    - Create a `ContextManager` that maintains a short-term and long-term memory of the user's goals, preferences, and recent actions.

- [ ] **3.2: Enable Proactive Suggestions**
    - Based on the context, Lisa can offer unsolicited but helpful suggestions.
    - **Example:** If you're looking at flight booking websites, Lisa could ask, "Are you planning a trip? I can look up hotel options for you."

- [ ] **3.3: User-Defined Workflows & Skills**
    - Allow users to teach Lisa new skills through natural language.
    - **Example:** "Lisa, from now on, when I say 'start my workday', I want you to open my code editor, launch my local server, and play my focus playlist on Spotify."

- [ ] **3.4: Deep System Integration**
    - Explore deeper integration with the operating system for tasks like file management, application control, and system settings.

---

## Phase 4: MetaHuman Integration

**Objectif:** Donner à Lisa une présence visuelle sous forme de MetaHuman pour enrichir l'interaction utilisateur.

- [ ] **4.1: Rechercher les solutions MetaHuman compatibles avec le web**
    - Explorer les technologies MetaHuman d'Epic Games
    - Évaluer les alternatives WebGL/WebGPU/Three.js
    - Examiner les frameworks Unreal Engine pour le web

- [ ] **4.2: Concevoir le modèle 3D/MetaHuman de Lisa**
    - Définir l'apparence et la personnalité visuelle
    - Créer les animations faciales et corporelles
    - Développer les expressions pour différentes émotions

- [ ] **4.3: Intégrer le MetaHuman dans l'application**
    - Implémenter le rendu via WebGL/canvas
    - Optimiser les performances pour différents appareils
    - Gérer le cycle de vie du modèle 3D

- [ ] **4.4: Synchroniser la voix et les expressions faciales**
    - Lier le TTS avec les mouvements labiaux
    - Traduire les intentions et émotions en expressions faciales
    - Réagir aux entrées vocales et visuelles

- [ ] **4.5: Concevoir l'API d'interaction**
    - Créer un système de communication bidirectionnelle
    - Permettre aux agents existants de contrôler le MetaHuman
    - Développer un MetaHumanAgent dédié

- [ ] **4.6: Ajouter des contrôles UI pour le MetaHuman**
    - Créer des commandes pour tester/interagir directement
    - Implémenter un panneau de configuration d'apparence
    - Permettre de basculer entre différentes vues du MetaHuman

- [ ] **4.7: Tester et valider l'intégration**
    - Vérifier la compatibilité cross-browser
    - Optimiser les performances
    - Tester l'expérience utilisateur
