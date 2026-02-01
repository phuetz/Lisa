# Lisa - Strategic Roadmap & TODO

## Vision

Evolve Lisa from a voice-command assistant into a proactive, agentic partner that rivals and surpasses platforms like Genspark and OpenManus. The goal is to create a highly intelligent, multi-modal, and extensible system built on a robust agentic architecture, while retaining its best-in-class voice-first user experience.

This roadmap is structured in three phases, moving from foundational architectural changes to advanced, differentiating features.

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

- [ ] **2.3: Implement Multi-modal Agents**
    - Leverage the existing vision capabilities to create vision-based agents.
    - **`OCRAgent`**: Reads text from the screen or a selected area. (Currently mocked)
    - **`VisionAgent`**: Can describe what it sees from the webcam (e.g., "What object am I holding up?"). (Currently mocked)

- [ ] **NEW: Implement real OCR and Vision capabilities**
    - Integrate a client-side OCR library like Tesseract.js into `OCRAgent`.
    - Integrate a vision model (e.g., from MediaPipe, which is already a dependency) into `VisionAgent`.

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

