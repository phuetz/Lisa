/**
 * Lisa Screen Capture Panel
 * Screenshot and recording UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getScreenCapture } from '../../gateway';
import type { Screenshot, Recording } from '../../gateway/ScreenCapture';

export function ScreenCapturePanel() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  const refreshData = useCallback(() => {
    const capture = getScreenCapture();
    setScreenshots(capture.getScreenshots());
    setRecordings(capture.getRecordings());
    setIsRecording(capture.isRecording());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleScreenshot = async () => {
    const capture = getScreenCapture();
    const result = await capture.captureScreen();
    if (result) {
      setSelectedScreenshot(result);
    }
    refreshData();
  };

  const handleStartRecording = async () => {
    const capture = getScreenCapture();
    await capture.startRecording();
    refreshData();
  };

  const handleStopRecording = () => {
    const capture = getScreenCapture();
    capture.stopRecording();
    refreshData();
  };

  const handleDownloadScreenshot = (id: string) => {
    const capture = getScreenCapture();
    capture.downloadScreenshot(id);
  };

  const handleDownloadRecording = (id: string) => {
    const capture = getScreenCapture();
    capture.downloadRecording(id);
  };

  const stats = getScreenCapture().getStats();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📸 Screen Capture</h2>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={handleScreenshot} style={styles.screenshotButton}>
          📷 Capture d'écran
        </button>
        {isRecording ? (
          <button onClick={handleStopRecording} style={styles.stopButton}>
            ⏹️ Arrêter ({Math.round((Date.now() - (getScreenCapture().getCurrentRecording()?.startedAt.getTime() || Date.now())) / 1000)}s)
          </button>
        ) : (
          <button onClick={handleStartRecording} style={styles.recordButton}>
            🔴 Enregistrer
          </button>
        )}
      </div>

      {/* Preview */}
      {selectedScreenshot && (
        <div style={styles.preview}>
          <img 
            src={selectedScreenshot.dataUrl} 
            alt="Screenshot" 
            style={styles.previewImage}
          />
          <button 
            onClick={() => handleDownloadScreenshot(selectedScreenshot.id)}
            style={styles.downloadButton}
          >
            ⬇️ Télécharger
          </button>
        </div>
      )}

      {/* Screenshots */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Screenshots ({screenshots.length})</h3>
        <div style={styles.grid}>
          {screenshots.slice(-6).map((ss) => (
            <div 
              key={ss.id} 
              style={styles.thumbnail}
              onClick={() => setSelectedScreenshot(ss)}
            >
              <img src={ss.dataUrl} alt="" style={styles.thumbImage} />
              <div style={styles.thumbInfo}>
                {ss.width}x{ss.height}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recordings */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Enregistrements ({recordings.length})</h3>
        <div style={styles.recordingsList}>
          {recordings.length === 0 ? (
            <div style={styles.emptyState}>Aucun enregistrement</div>
          ) : (
            recordings.map((rec) => (
              <div key={rec.id} style={styles.recordingItem}>
                <div style={styles.recordingInfo}>
                  <span style={styles.recordingDuration}>{Math.round(rec.duration)}s</span>
                  <span style={styles.recordingSize}>{(rec.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
                <button 
                  onClick={() => handleDownloadRecording(rec.id)}
                  style={styles.smallButton}
                >
                  ⬇️
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <span>{stats.screenshotCount} captures</span>
        <span>•</span>
        <span>{stats.recordingCount} vidéos</span>
        <span>•</span>
        <span>{(stats.totalRecordingSize / 1024 / 1024).toFixed(1)} MB total</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  actions: { display: 'flex', gap: '12px', marginBottom: '20px' },
  screenshotButton: { flex: 1, padding: '14px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  recordButton: { flex: 1, padding: '14px', backgroundColor: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  stopButton: { flex: 1, padding: '14px', backgroundColor: '#6a6a82', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' },
  preview: { marginBottom: '20px', backgroundColor: '#252525', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  previewImage: { maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' },
  downloadButton: { marginTop: '12px', padding: '8px 16px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  section: { marginTop: '20px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#6a6a82', marginBottom: '12px', textTransform: 'uppercase' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  thumbnail: { backgroundColor: '#252525', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' },
  thumbImage: { width: '100%', height: '60px', objectFit: 'cover' },
  thumbInfo: { padding: '6px', fontSize: '10px', color: '#6a6a82', textAlign: 'center' },
  recordingsList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  emptyState: { padding: '20px', textAlign: 'center', color: '#6a6a82' },
  recordingItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#252525', borderRadius: '8px' },
  recordingInfo: { display: 'flex', gap: '16px' },
  recordingDuration: { fontSize: '14px', fontWeight: 500 },
  recordingSize: { fontSize: '13px', color: '#6a6a82' },
  smallButton: { padding: '6px 12px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  stats: { display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #2d2d44', fontSize: '12px', color: '#6a6a82', justifyContent: 'center' }
};

export default ScreenCapturePanel;
