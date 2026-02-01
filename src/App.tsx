import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import PlannerStatus from './components/PlannerStatus';
import './App.css';
import {
  useFaceLandmarker,
  useHandLandmarker,
  useObjectDetector,
  usePoseLandmarker,
  useAudioClassifier,
  useSpeechResponder,
  useVoiceIntent,
} from './hooks';
import LisaCanvas from './components/LisaCanvas';
import WeatherBanner from './components/WeatherBanner';
import AppsPanel from './components/AppsPanel';
import ResourceViewer from './components/ResourceViewer';
import AlarmTimerPanel from './components/AlarmTimerPanel';
import TodoPanel from './components/TodoPanel';
import MicIndicator from './components/MicIndicator';
import { GoogleCalendarButton } from './components/GoogleCalendarButton';
import { ClipboardSummaryPanel } from './components/ClipboardSummaryPanel';
import { SpeechSynthesisPanel } from './components/SpeechSynthesisPanel';
import OCRPanel from './components/OCRPanel';
import VisionPanel from './components/VisionPanel';
import CodeInterpreterPanel from './components/CodeInterpreterPanel';
import ProactiveSuggestionsPanel from './components/ProactiveSuggestionsPanel';
import useAlarmTimerScheduler from './hooks/useAlarmTimerScheduler';
import { useWakeWord } from './hooks/useWakeWord';
import { useWorkflowManager } from './hooks/useWorkflowManager';
import { useIntentHandler } from './hooks/useIntentHandler';
import { WorkflowManagerPanel } from './components/WorkflowManagerPanel';
import { UserWorkflowPanel } from './components/UserWorkflowPanel';
import SystemIntegrationPanel from './components/SystemIntegrationPanel';
import MemoryPanel from './components/MemoryPanel';
import PlanExplanationPanel from './components/PlanExplanationPanel';
import DebugPanel from './components/DebugPanel';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';
import GitHubPanel from './components/GitHubPanel';
import PowerShellPanel from './components/PowerShellPanel';
import ScreenSharePanel from './components/ScreenSharePanel';
import { MetaHumanCanvas } from './components/MetaHumanCanvas';
import { MetaHumanControlsPanel } from './components/MetaHumanControlsPanel';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micStream, setMicStream] = useState<MediaStream>();
  const [audioCtx] = useState(() => new AudioContext());

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 640, height: 360, facingMode: 'user' },
        audio: true,
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMicStream(stream);
      });
  }, []);

  // Activate hooks
  useFaceLandmarker(videoRef.current!);
  useHandLandmarker(videoRef.current!);
  useObjectDetector(videoRef.current!);
  usePoseLandmarker(videoRef.current!);
  useAudioClassifier(audioCtx, micStream);
  useWakeWord(audioCtx, micStream);
  useSpeechResponder();
  useVoiceIntent();
  useAlarmTimerScheduler();
  useWorkflowManager();
  useSpeechSynthesis(); // Initialiser le hook de synthèse vocale
  const { handleIntent } = useIntentHandler();
  // Récupérer l'ID de trace du dernier plan pour les explications

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ position:'absolute', bottom:10, right:10, width:200, borderRadius:8 }}
      />
      <LisaCanvas video={videoRef.current} />
      <MicIndicator />
      <WeatherBanner />
      <AppsPanel />
      <PlannerStatus />
      <Toaster />
      <ResourceViewer />
      <PlanExplanationPanel />
      <DebugPanel />
      <div className="fixed top-4 right-4 w-80 flex flex-col gap-2">
        <WorkflowManagerPanel handleIntent={handleIntent} />
        <UserWorkflowPanel handleIntent={handleIntent} />
        <SystemIntegrationPanel />
        <MemoryPanel />
        <ProactiveSuggestionsPanel />
        <SpeechSynthesisPanel />
        <VisionPanel />
        <OCRPanel />
        <CodeInterpreterPanel />
        <ClipboardSummaryPanel />
        <GitHubPanel />
        <PowerShellPanel />
        <ScreenSharePanel />
        <MetaHumanControlsPanel />
      </div>
      <div className="fixed bottom-4 right-4 flex gap-2">
        <GoogleCalendarButton />
        <AlarmTimerPanel />
        <TodoPanel />
      </div>
      {/* MetaHuman désactivé temporairement - triangle.gltf manquant */}
      {/* <MetaHumanCanvas /> */}
    </div>
  );
}

export default App
