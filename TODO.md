# Lisa - Strategic Roadmap & TODO

## Vision

Evolve Lisa from a voice-command assistant into a proactive, agentic partner that rivals and surpasses platforms like Genspark and OpenManus. The goal is to create a highly intelligent, multi-modal, and extensible system built on a robust agentic architecture, while retaining its best-in-class voice-first user experience.

This roadmap is structured in four phases, moving from foundational architectural changes to advanced, differentiating features.

---

## Phase 1: The Agentic Core (Inspired by OpenManus)

**Objective:** Replace the rigid, rule-based intent parser with a flexible, agent-based orchestration system.

- [x] **1.1: Introduce a Central `AgentRegistry`**
    - Create a central registry to manage and access all available agents.
    - This is the foundation for a modular and extensible system.

- [x] **1.2: Refactor Existing Logic into `HandlerAgents`**
    - Convert existing functionalities into standalone, single-purpose agents.
    - **`WeatherAgent`**: Encapsulates all logic for fetching and displaying weather.
    - **`CalendarAgent`**: Manages all interactions with the Google Calendar API (listing, creating events).
    - **`TodoAgent`**: Handles all to-do list operations.

- [x] **1.3: Implement a `PlannerAgent`**
    - This is the most critical step to move beyond simple commands.
    - This agent will replace the `parseIntent` function.
    - It will use a powerful LLM (like GPT-4 or Gemini) to understand natural language requests.
    - Based on the request, it will determine which `HandlerAgent` (or sequence of agents) to call from the `AgentRegistry`.
    - **Example:** The request "What's the weather like for my first meeting tomorrow?" would require the `PlannerAgent` to first call the `CalendarAgent` to find the meeting time and location, then call the `WeatherAgent` with that information.

- [x] **1.4: Update Voice Hooks to use the `PlannerAgent`**
    - Modify `useVoiceIntent` to pass the user's speech directly to the `PlannerAgent` instead of the `parseIntent` function.

---

## Phase 2: Expanding Capabilities (Inspired by Genspark)

**Objective:** Broaden Lisa's skillset by giving agents the ability to use tools and understand multiple modalities.

- [x] **2.1: Implement a `ToolBox` for Agents**
    - Create a collection of tools that agents can use.
    - **`WebSearchTool`**: Allow an agent to search the web for real-time information.
    - **`CodeInterpreterTool`**: A secure environment for an agent to run code (e.g., for calculations or data analysis), similar to OpenManus's `CodeInterpreterAgent`.

- [x] **2.2: Develop a `WebSearchAgent`**
    - An agent that uses the `WebSearchTool` to answer questions that require up-to-date information.
    - **Example:** "What are the reviews for the new movie playing downtown?"

- [x] **2.3: Implement Multi-modal Agents**
    - Leverage the existing vision capabilities to create vision-based agents.
    - **`OCRAgent`**: Reads text from the screen or a selected area.
    - **`VisionAgent`**: Can describe what it sees from the webcam.

- [x] **2.4: Develop a Simple Workflow Engine**
    - Enhance the `PlannerAgent` to execute multi-step plans (workflows).
    - This allows for complex tasks like, "Research the best local Italian restaurants, book a table for two for 8 PM tomorrow, and add it to my calendar."

---

## Phase 3: Proactive & Personalized Assistance

**Objective:** Make Lisa a truly intelligent partner that anticipates needs and learns from the user.

- [x] **3.1: Implement Advanced Contextual Awareness**
    - Go beyond simple `lastUtterance` context.
    - Create a `ContextManager` that maintains a short-term and long-term memory of the user's goals, preferences, and recent actions.

- [x] **3.2: Enable Proactive Suggestions**
    - Based on the context, Lisa can offer unsolicited but helpful suggestions.
    - **Example:** If you're looking at flight booking websites, Lisa could ask, "Are you planning a trip? I can look up hotel options for you."

- [x] **3.3: User-Defined Workflows & Skills**
    - Allow users to teach Lisa new skills through natural language.
    - **Example:** "Lisa, from now on, when I say 'start my workday', I want you to open my code editor, launch my local server, and play my focus playlist on Spotify."

- [x] **3.4: Deep System Integration**
    - Explore deeper integration with the operating system for tasks like file management, application control, and system settings.

---

## Phase 4: Multi-modal Sensory Integration (The Five Senses)

**Objective:** Expand Lisa's perception beyond sight and hearing to include touch, smell, and taste (indirectly), and fuse these inputs for a richer understanding of the environment.

- [x] **4.1: Enhance Vision (Deeper Scene Understanding)**
    - **4.1.1: Choix & test modèle:** Implement a notebook/TS to compare EfficientDet-Lite vs YOLOv8-n tfjs on 50 COCO images (val 2017). Generate `docs/vision/benchmark_v1.md` report. (Placeholder created, requires manual execution and data filling).
    - **4.1.2: Module front `src/senses/vision.ts`:** Implement Web Worker + WebGL/WebGPU; fallback CPU. Asynchronous pipeline → `postMessage` events. (Implemented).
    - **4.1.3: Événement bus:** New `Percept<V>` type. Encapsulate existing MediaPipe BBox into this format. (Implemented).
    - **4.1.4: UI:** Extend overlay (SVG/Canvas) to display multiple sources + color per model. Toggle `"advancedVision"` in `config.json`. (Implemented).
    - **4.1.5: Perf & tests:** Mini benchmarks (COCO val 2017) ⇒ FPS, latency, RAM, heating. (Requires manual execution).

- [x] **4.2: Enhance Audition (Advanced NLU & Emotional Tone)**
    - **4.2.1: STT:** `Whisper-tiny` (wasm/onnx) or `Vosk-WebAssembly`. (Placeholder in `src/workers/hearingWorker.ts`).
    - **4.2.2: NLU:** `@xenova/transformers` → DistilBERT Sentiment + Intent. (Placeholder in `src/workers/hearingWorker.ts`).
    - **4.2.3: SER:** Speech-Emotion-Recognizer (tfjs). (Placeholder in `src/workers/hearingWorker.ts`).
    - **4.2.4: Module front `src/senses/hearing.ts`:** Web Worker audio pipeline. Fallback on Web Speech API if device is weak. (Implemented).
    - **4.2.5: Bus:** `Percept<{text:string}|{emotion:string}>` with `modality:"hearing"`. (Implemented).
    - **4.2.6: UI console:** In Lisa dev bar. (Implemented as `HearingPanel.tsx`).

- [ ] **4.3: Implement Touch (Tactile/Proprioception - Indirect)**
    - Integrate with IoT platforms (e.g., via MQTT.js) to receive data from environmental sensors (temperature, pressure, haptic feedback).
    - Explore Web Bluetooth / Web USB APIs for direct connection to local sensors.

- [ ] **4.4: Implement Smell (Olfaction - Indirect)**
    - Integrate with electronic nose (e-nose) sensors via IoT platforms (MQTT.js).
    - Develop data analysis pipelines to interpret e-nose data and identify "smells."

- [ ] **4.5: Implement Taste (Gustation - Highly Indirect/Conceptual)**
    - Research and integrate with highly specialized chemical sensors (conceptual for now).

- [ ] **4.6: General Cognitive Integration & Fusion**
    - Develop Knowledge Graphs (e.g., using RDF.js, json-ld.js) to build a structured understanding from diverse sensory inputs.
    - Further leverage multi-modal AI models (e.g., Gemini API) to process and reason over combined sensory inputs for holistic understanding.

---

## TÂCHES TRANSVERSES

- [x] **1. Feature flags:** `advancedVision`, `advancedHearing`. (Implemented).
- [x] **2. Docs:** Add sections “Vision avancée” & “Audition avancée” in `README.md`. `TODO.md` → backlog détaillé par lot. (Updated `README.md` and this `TODO.md`).
- [ ] **3. Tests e2e:** Cypress ou Playwright pour vérifier non-régression. (Requires manual execution).
- [ ] **4. CI:** Execute light benchmarks (Node + Puppeteer headless). (Requires manual setup and execution).
- [ ] **5. Commits:** One lot = one PR; clear description, screenshots, perf measurements. (Requires manual action).

---

## ✅ CRITÈRES DE RÉUSSITE
- L’appli tourne toujours sur un laptop basique **sans** WebGPU (fallback OK).
- Gain de précision object ≥ +10 mAP, SER ≥ 75 % accuracy (RAVDESS mini-set).
- Aucun gel UI > 100 ms ; CPU < 60 % moyenne sur laptop i5.
- Documentation & flags en place ; overlay multi-source fonctionnel.