# Infrastructure TODOs - Lower Priority Items

This document tracks infrastructure TODOs that are not critical for current functionality but would improve the system.

---

## ✅ Completed Infrastructure

- Vision Worker YOLOv8 integration
- Hearing Worker Whisper integration
- Gemini API for content generation
- Real geocoding for WeatherAgent
- Real translation via Gemini
- Email reply generation via Gemini

---

## 📝 Remaining TODOs (Non-Critical)

### 1. CPU Fallback for Vision

**File:** `src/senses/vision.ts` (line 31)

**Current State:** Vision worker requires Web Workers support

**TODO:**
```typescript
// Implement CPU fallback here - could use MediaPipe directly on main thread
```

**Impact:** Low - Most modern browsers support Web Workers

**Implementation:**
- Use MediaPipe ObjectDetector on main thread when Web Workers unavailable
- Performance will be reduced but feature remains functional
- Trade-off: 10-20% CPU usage increase vs full compatibility

**Recommendation:** Implement only if user reports browser compatibility issues

---

### 2. Custom Wake Word

**File:** `src/hooks/useWakeWord.ts` (line 29)

**Current State:** Using built-in "PORCUPINE" keyword

**TODO:**
```typescript
keywords: [BuiltInKeyword.PORCUPINE], // TODO: replace by custom "lisa" keyword
```

**Impact:** Medium - User experience would be better with "Lisa" wake word

**Implementation:**
1. Train Picovoice custom wake word model for "Lisa"
2. Purchase Picovoice license (if required)
3. Replace BuiltInKeyword with custom model file
4. Test accuracy and false positive rate

**Cost:** Picovoice custom models may require subscription

**Recommendation:** Document limitation, implement if budget allows

---

### 3. ROS Bridge URL Configuration
**Status:** **✅ COMPLETED** - Implemented in `RobotAgent.ts`.

---

### 4. Pose Skeleton Rendering
**Status:** **✅ COMPLETED** - Implemented in `LisaCanvas.tsx`.

---

### 5. Workflow Undo/Redo History

**File:** `src/workflow/store/useWorkflowStore.ts` (lines 111, 115, 119)

**Current State:** Placeholders for undo/redo functionality

**TODO:**
```typescript
// TODO: Implémenter l'historique d'undo/redo
// TODO: Sauvegarder l'état actuel dans l'historique
```

**Impact:** Medium - Would improve workflow editing UX

**Implementation:**
```typescript
const [history, setHistory] = useState<WorkflowState[]>([]);
const [historyIndex, setHistoryIndex] = useState(0);

undo: () => {
  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    set(previousState);
    setHistoryIndex(newIndex);
  }
},

redo: () => {
  if (historyIndex < history.length - 1) {
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    set(nextState);
    setHistoryIndex(newIndex);
  }
},

// Save to history on每 change
onNodesChange: (changes) => {
  // Apply changes...
  saveToHistory(get());
}
```

**Status:** **🟡 MEDIUM PRIORITY - Improves UX but not critical**

---

### 6. Logging System Integration
**Status:** **✅ COMPLETED** - Integrated with Sentry.

---

## Implementation Priority

| Priority | Item | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| 🔴 HIGH | Logging Integration | 2h | High | Pending |
| 🟡 MEDIUM | Undo/Redo Workflow | 4h | Medium | Pending |
| 🟡 MEDIUM | Custom Wake Word | 8h | Medium | Pending |
| ✅ LOW | ROS Config | 10min | Low | **Can implement now** |
| ✅ LOW | Pose Skeleton | 1h | Low | **Can implement now** |
| ⚪ OPTIONAL | CPU Fallback Vision | 6h | Low | Wait for need |

---

## Quick Wins (Can Implement Now)

### ROS Bridge Configuration
```typescript
// File: src/agents/RobotAgent.ts
const ROS_BRIDGE_URL = import.meta.env.VITE_ROS_BRIDGE_URL || 'ws://localhost:9090';
this.ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });
```

### Pose Skeleton Rendering
See implementation detail in section 4 above.

---

## Recommendation

1. **Implement Quick Wins** if user requests them (< 2h total)
2. **Logging integration** should be done before production deployment
3. **Undo/Redo** can wait for user feedback on workflow usage
4. **Custom wake word** depends on budget and license availability
5. **CPU fallback** only if compatibility issues reported

---

## Notes

- All critical functionality is now REAL (not simulated)
- Remaining TODOs are enhancements, not blocker s
- System is production-ready with current state (with Gemini API key)
