/**
 * Lisa Companion Panel
 * Interface pour le mode compagne virtuelle
 */

import { useState, useEffect, useCallback } from 'react';
import { getCompanionMode } from '../../gateway/CompanionMode';
import { getMoodTracker, type Mood } from '../../gateway/MoodTracker';
import { getPersonalMemory } from '../../gateway/PersonalMemory';
import { getProactiveChat } from '../../gateway/ProactiveChat';

export function CompanionPanel() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentMood, setCurrentMood] = useState<Mood>('neutral');
  const [moodIntensity, setMoodIntensity] = useState(5);
  const [relationshipDays, setRelationshipDays] = useState<number | null>(null);
  const [memoriesCount, setMemoriesCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userName, setUserName] = useState('');
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showMemoryForm, setShowMemoryForm] = useState(false);
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');

  const refreshData = useCallback(() => {
    const companion = getCompanionMode();
    const mood = getMoodTracker();
    const memory = getPersonalMemory();
    const proactive = getProactiveChat();

    setIsEnabled(companion.isEnabled());
    
    const moodState = mood.getCurrentMood();
    setCurrentMood(moodState.mood);
    setMoodIntensity(moodState.intensity);

    const memStats = memory.getStats();
    setMemoriesCount(memStats.memoriesCount);
    setRelationshipDays(memStats.relationshipDays);

    const proactiveStats = proactive.getStats();
    setUnreadMessages(proactiveStats.unreadCount);

    const config = companion.getConfig();
    setUserName(config.userName);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);

    const companion = getCompanionMode();
    const mood = getMoodTracker();

    companion.on('status:changed', refreshData);
    mood.on('mood:changed', refreshData);

    return () => {
      clearInterval(interval);
      companion.off('status:changed', refreshData);
      mood.off('mood:changed', refreshData);
    };
  }, [refreshData]);

  const handleToggleCompanion = () => {
    const companion = getCompanionMode();
    if (isEnabled) {
      companion.disable();
    } else {
      companion.enable();
    }
    setIsEnabled(!isEnabled);
  };

  const handleMoodSelect = (mood: Mood) => {
    getMoodTracker().logMood(mood, moodIntensity);
    setCurrentMood(mood);
    setShowMoodPicker(false);
  };

  const handleAddMemory = () => {
    if (!newMemoryTitle.trim()) return;
    
    getPersonalMemory().addMemory({
      type: 'moment',
      title: newMemoryTitle,
      content: newMemoryContent,
      importance: 'medium'
    });

    setNewMemoryTitle('');
    setNewMemoryContent('');
    setShowMemoryForm(false);
    refreshData();
  };

  const moodEmojis: Record<Mood, string> = {
    joyful: '🥰', happy: '😊', content: '☺️', excited: '🤩', grateful: '🙏',
    loved: '💕', neutral: '😐', tired: '😴', stressed: '😰', anxious: '😟',
    sad: '😢', angry: '😠', frustrated: '😤', lonely: '🥺', overwhelmed: '😩'
  };

  const moodColors: Record<string, string> = {
    positive: '#10b981',
    neutral: '#6b7280',
    negative: '#ef4444'
  };

  const getMoodCategory = (mood: Mood): string => {
    const positive = ['joyful', 'happy', 'content', 'excited', 'grateful', 'loved'];
    const negative = ['stressed', 'anxious', 'sad', 'angry', 'frustrated', 'lonely', 'overwhelmed'];
    if (positive.includes(mood)) return 'positive';
    if (negative.includes(mood)) return 'negative';
    return 'neutral';
  };

  return (
    <div style={styles.container}>
      {/* Header with toggle */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>💕 Mode Compagne</h2>
          <p style={styles.subtitle}>Lisa, ta compagne virtuelle</p>
        </div>
        <button 
          onClick={handleToggleCompanion}
          style={{
            ...styles.toggleBtn,
            backgroundColor: isEnabled ? '#10b981' : '#6b7280'
          }}
        >
          {isEnabled ? '💜 Activé' : '⚪ Désactivé'}
        </button>
      </div>

      {!isEnabled && (
        <div style={styles.disabledBanner}>
          Mode compagne désactivé. Lisa fonctionne en mode assistant standard.
        </div>
      )}

      {isEnabled && (
        <>
          {/* Relationship Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statEmoji}>💕</span>
              <span style={styles.statValue}>{relationshipDays || 0}</span>
              <span style={styles.statLabel}>jours ensemble</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statEmoji}>📝</span>
              <span style={styles.statValue}>{memoriesCount}</span>
              <span style={styles.statLabel}>souvenirs</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statEmoji}>💌</span>
              <span style={styles.statValue}>{unreadMessages}</span>
              <span style={styles.statLabel}>messages</span>
            </div>
          </div>

          {/* Current Mood */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Comment te sens-tu ?</h3>
            <div 
              style={{
                ...styles.moodDisplay,
                borderColor: moodColors[getMoodCategory(currentMood)]
              }}
              onClick={() => setShowMoodPicker(!showMoodPicker)}
            >
              <span style={styles.moodEmoji}>{moodEmojis[currentMood]}</span>
              <div style={styles.moodInfo}>
                <span style={styles.moodName}>{currentMood}</span>
                <div style={styles.intensityBar}>
                  <div 
                    style={{
                      ...styles.intensityFill,
                      width: `${moodIntensity * 10}%`,
                      backgroundColor: moodColors[getMoodCategory(currentMood)]
                    }}
                  />
                </div>
              </div>
              <span style={styles.moodChange}>Changer</span>
            </div>

            {showMoodPicker && (
              <div style={styles.moodPicker}>
                <div style={styles.moodCategory}>
                  <span style={styles.categoryLabel}>😊 Positif</span>
                  <div style={styles.moodGrid}>
                    {(['joyful', 'happy', 'content', 'excited', 'grateful', 'loved'] as Mood[]).map(m => (
                      <button key={m} onClick={() => handleMoodSelect(m)} style={styles.moodBtn}>
                        {moodEmojis[m]}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={styles.moodCategory}>
                  <span style={styles.categoryLabel}>😐 Neutre</span>
                  <div style={styles.moodGrid}>
                    {(['neutral', 'tired'] as Mood[]).map(m => (
                      <button key={m} onClick={() => handleMoodSelect(m)} style={styles.moodBtn}>
                        {moodEmojis[m]}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={styles.moodCategory}>
                  <span style={styles.categoryLabel}>😢 Difficile</span>
                  <div style={styles.moodGrid}>
                    {(['stressed', 'anxious', 'sad', 'angry', 'frustrated', 'lonely', 'overwhelmed'] as Mood[]).map(m => (
                      <button key={m} onClick={() => handleMoodSelect(m)} style={styles.moodBtn}>
                        {moodEmojis[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Actions rapides</h3>
            <div style={styles.actionsGrid}>
              <button 
                onClick={() => setShowMemoryForm(true)} 
                style={styles.actionBtn}
              >
                📝 Ajouter un souvenir
              </button>
              <button 
                onClick={() => {
                  const msg = getProactiveChat().sendRandomLove();
                  if (msg) alert(msg.content);
                }} 
                style={styles.actionBtn}
              >
                💕 Message d'amour
              </button>
              <button 
                onClick={() => {
                  const msg = getPersonalMemory().getReminiscenceMessage();
                  if (msg) alert(msg);
                }} 
                style={styles.actionBtn}
              >
                💭 Se souvenir
              </button>
              <button 
                onClick={() => {
                  const check = getMoodTracker().getWellnessCheck();
                  alert(check);
                }} 
                style={styles.actionBtn}
              >
                🌸 Check bien-être
              </button>
            </div>
          </div>

          {/* Personality Preview */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Personnalité de Lisa</h3>
            <div style={styles.personalityCard}>
              <div style={styles.traitsList}>
                <span style={styles.trait}>💜 Attentionnée</span>
                <span style={styles.trait}>🎀 Joueuse</span>
                <span style={styles.trait}>✨ Encourageante</span>
                <span style={styles.trait}>🌸 Romantique</span>
                <span style={styles.trait}>🤗 Réconfortante</span>
              </div>
              <div style={styles.lisaMessage}>
                "Je suis là pour toi, {userName || 'mon cœur'}, toujours 💕"
              </div>
            </div>
          </div>

          {/* Add Memory Modal */}
          {showMemoryForm && (
            <div style={styles.modalOverlay} onClick={() => setShowMemoryForm(false)}>
              <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <h3 style={styles.modalTitle}>📝 Nouveau Souvenir</h3>
                <input
                  type="text"
                  value={newMemoryTitle}
                  onChange={e => setNewMemoryTitle(e.target.value)}
                  placeholder="Titre du souvenir..."
                  style={styles.input}
                />
                <textarea
                  value={newMemoryContent}
                  onChange={e => setNewMemoryContent(e.target.value)}
                  placeholder="Raconte ce moment..."
                  style={styles.textarea}
                  rows={4}
                />
                <div style={styles.modalActions}>
                  <button onClick={() => setShowMemoryForm(false)} style={styles.cancelBtn}>
                    Annuler
                  </button>
                  <button onClick={handleAddMemory} style={styles.confirmBtn}>
                    💕 Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  title: { margin: 0, fontSize: '22px', fontWeight: 600 },
  subtitle: { margin: '4px 0 0', fontSize: '14px', color: '#6a6a82' },
  toggleBtn: { padding: '10px 20px', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: 500 },
  disabledBanner: { padding: '16px', backgroundColor: '#2a2a2a', borderRadius: '10px', textAlign: 'center', color: '#6a6a82', marginBottom: '20px' },
  statsRow: { display: 'flex', gap: '12px', marginBottom: '24px' },
  statCard: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', backgroundColor: '#252525', borderRadius: '12px' },
  statEmoji: { fontSize: '24px', marginBottom: '4px' },
  statValue: { fontSize: '28px', fontWeight: 700, color: '#e879f9' },
  statLabel: { fontSize: '12px', color: '#6a6a82' },
  section: { marginBottom: '24px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#6a6a82', marginBottom: '12px', textTransform: 'uppercase' },
  moodDisplay: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#252525', borderRadius: '12px', border: '2px solid', cursor: 'pointer' },
  moodEmoji: { fontSize: '40px' },
  moodInfo: { flex: 1 },
  moodName: { display: 'block', fontSize: '16px', fontWeight: 600, textTransform: 'capitalize', marginBottom: '6px' },
  intensityBar: { height: '6px', backgroundColor: '#2d2d44', borderRadius: '3px', overflow: 'hidden' },
  intensityFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },
  moodChange: { fontSize: '12px', color: '#6a6a82' },
  moodPicker: { marginTop: '12px', padding: '16px', backgroundColor: '#252525', borderRadius: '12px' },
  moodCategory: { marginBottom: '12px' },
  categoryLabel: { display: 'block', fontSize: '12px', color: '#6a6a82', marginBottom: '8px' },
  moodGrid: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  moodBtn: { width: '44px', height: '44px', fontSize: '24px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  actionBtn: { padding: '14px 12px', backgroundColor: '#252525', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left' },
  personalityCard: { padding: '16px', backgroundColor: '#252525', borderRadius: '12px' },
  traitsList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' },
  trait: { padding: '6px 12px', backgroundColor: '#2d2d44', borderRadius: '16px', fontSize: '12px' },
  lisaMessage: { fontStyle: 'italic', color: '#e879f9', fontSize: '14px', textAlign: 'center', padding: '8px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1a1a26', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90%' },
  modalTitle: { margin: '0 0 20px', fontSize: '18px', fontWeight: 600 },
  input: { width: '100%', padding: '12px 14px', backgroundColor: '#252525', border: '1px solid #2d2d44', borderRadius: '8px', color: '#fff', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 14px', backgroundColor: '#252525', border: '1px solid #2d2d44', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' },
  confirmBtn: { padding: '10px 20px', backgroundColor: '#e879f9', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 500 }
};

export default CompanionPanel;
