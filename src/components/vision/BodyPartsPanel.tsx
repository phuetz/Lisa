/**
 * BodyPartsPanel Component
 * Displays detected body parts with detailed information
 * Shows skeleton visualization and body part status
 */

import { useMemo } from 'react';
import { User, CircleDot, Activity, Zap } from 'lucide-react';
import {
  BODY_LANDMARKS,
  BODY_GROUPS,
  LANDMARK_NAMES,
  type PoseLandmark,
  type BodyGroupStatus,
} from './bodyPartsConstants';

interface BodyPartsPanelProps {
  landmarks: PoseLandmark[] | null;
  showDetails?: boolean;
  compact?: boolean;
}

export function BodyPartsPanel({ landmarks, showDetails = true, compact = false }: BodyPartsPanelProps) {
  // Analyze body parts visibility
  const bodyStatus = useMemo(() => {
    if (!landmarks || landmarks.length === 0) return null;

    const groups: Record<string, BodyGroupStatus> = {};

    Object.entries(BODY_GROUPS).forEach(([groupKey, group]) => {
      const groupLandmarks = group.landmarks.map(landmarkKey => {
        const idx = BODY_LANDMARKS[landmarkKey as keyof typeof BODY_LANDMARKS];
        const landmark = landmarks[idx];
        const isVisible = landmark && landmark.visibility > 0.5;
        
        return {
          name: LANDMARK_NAMES[landmarkKey] || landmarkKey,
          key: landmarkKey,
          visible: isVisible,
          visibility: landmark?.visibility || 0,
          position: {
            x: landmark?.x || 0,
            y: landmark?.y || 0,
            z: landmark?.z || 0,
          },
        };
      });

      const visibleCount = groupLandmarks.filter(l => l.visible).length;
      const avgVis = groupLandmarks.reduce((sum, l) => sum + l.visibility, 0) / groupLandmarks.length;

      groups[groupKey] = {
        name: group.name,
        icon: group.icon,
        color: group.color,
        visible: visibleCount,
        total: groupLandmarks.length,
        avgVisibility: avgVis,
        landmarks: groupLandmarks,
      };
    });

    return groups;
  }, [landmarks]);

  // Calculate overall body visibility
  const overallVisibility = useMemo(() => {
    if (!landmarks) return 0;
    const validLandmarks = landmarks.filter(l => l && l.visibility > 0);
    if (validLandmarks.length === 0) return 0;
    return validLandmarks.reduce((sum, l) => sum + l.visibility, 0) / validLandmarks.length;
  }, [landmarks]);

  // Detect pose/posture
  const poseAnalysis = useMemo(() => {
    if (!landmarks || landmarks.length < 33) return null;

    const leftShoulder = landmarks[BODY_LANDMARKS.leftShoulder];
    const rightShoulder = landmarks[BODY_LANDMARKS.rightShoulder];
    const leftHip = landmarks[BODY_LANDMARKS.leftHip];
    const rightHip = landmarks[BODY_LANDMARKS.rightHip];
    const nose = landmarks[BODY_LANDMARKS.nose];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return null;

    // Check if standing, sitting, or lying
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const torsoLength = Math.abs(hipY - shoulderY);

    // Check shoulder alignment (leaning)
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const isLeaning = shoulderDiff > 0.05;
    const leanDirection = leftShoulder.y > rightShoulder.y ? 'gauche' : 'droite';

    // Check if arms raised
    const leftWrist = landmarks[BODY_LANDMARKS.leftWrist];
    const rightWrist = landmarks[BODY_LANDMARKS.rightWrist];
    const leftArmRaised = leftWrist && leftShoulder && leftWrist.y < leftShoulder.y;
    const rightArmRaised = rightWrist && rightShoulder && rightWrist.y < rightShoulder.y;

    // Estimate posture
    let posture = 'Debout';
    if (torsoLength < 0.15) {
      posture = 'Assis ou accroupi';
    }
    if (nose && Math.abs(nose.y - shoulderY) < 0.1) {
      posture = 'Allongé';
    }

    return {
      posture,
      isLeaning,
      leanDirection,
      leftArmRaised,
      rightArmRaised,
      torsoLength,
    };
  }, [landmarks]);

  if (!landmarks || landmarks.length === 0) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
      }}>
        <User size={32} color="#666" style={{ margin: '0 auto 8px' }} />
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          Aucune personne détectée
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: compact ? '12px' : '16px',
    }}>
      {/* Header with overall status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #333',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#8b5cf620',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Activity size={20} color="#8b5cf6" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
              Corps Détecté
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
              {Math.round(overallVisibility * 100)}% visible
            </p>
          </div>
        </div>
        
        {/* Visibility indicator */}
        <div style={{
          width: '60px',
          height: '6px',
          backgroundColor: '#333',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${overallVisibility * 100}%`,
            height: '100%',
            backgroundColor: overallVisibility > 0.7 ? '#10b981' : overallVisibility > 0.4 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Pose Analysis */}
      {poseAnalysis && (
        <div style={{
          backgroundColor: '#252525',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={14} color="#f59e0b" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>Analyse Posture</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{
              padding: '4px 10px',
              backgroundColor: '#8b5cf620',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#a78bfa',
            }}>
              {poseAnalysis.posture}
            </span>
            {poseAnalysis.isLeaning && (
              <span style={{
                padding: '4px 10px',
                backgroundColor: '#f59e0b20',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fbbf24',
              }}>
                Penché {poseAnalysis.leanDirection}
              </span>
            )}
            {poseAnalysis.leftArmRaised && (
              <span style={{
                padding: '4px 10px',
                backgroundColor: '#10b98120',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#34d399',
              }}>
                🤚 Bras G levé
              </span>
            )}
            {poseAnalysis.rightArmRaised && (
              <span style={{
                padding: '4px 10px',
                backgroundColor: '#3b82f620',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#60a5fa',
              }}>
                ✋ Bras D levé
              </span>
            )}
          </div>
        </div>
      )}

      {/* Body groups */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: '8px',
      }}>
        {bodyStatus && Object.entries(bodyStatus).map(([key, group]) => {
          const Icon = group.icon;
          const visibilityPercent = Math.round(group.avgVisibility * 100);
          
          return (
            <div
              key={key}
              style={{
                backgroundColor: '#252525',
                borderRadius: '8px',
                padding: '10px',
                borderLeft: `3px solid ${group.color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Icon size={14} color={group.color} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
                  {group.name}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>
                  {group.visible}/{group.total} pts
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: visibilityPercent > 70 ? '#10b981' : visibilityPercent > 40 ? '#f59e0b' : '#ef4444',
                }}>
                  {visibilityPercent}%
                </span>
              </div>
              
              {/* Mini visibility bar */}
              <div style={{
                width: '100%',
                height: '3px',
                backgroundColor: '#333',
                borderRadius: '2px',
                marginTop: '6px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${visibilityPercent}%`,
                  height: '100%',
                  backgroundColor: group.color,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed landmarks */}
      {showDetails && bodyStatus && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <CircleDot size={14} color="#888" />
            <span style={{ fontSize: '13px', color: '#888' }}>Points détaillés</span>
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            maxHeight: '120px',
            overflowY: 'auto',
            padding: '4px',
          }}>
            {Object.values(bodyStatus).flatMap(group => 
              group.landmarks
                .filter(l => l.visible)
                .map(landmark => (
                  <span
                    key={landmark.key}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: `${group.color}15`,
                      border: `1px solid ${group.color}40`,
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: group.color,
                    }}
                  >
                    {landmark.name}
                  </span>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BodyPartsPanel;
