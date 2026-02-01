/**
 * Lisa Skills Panel
 * UI for managing skills (inspired by OpenClaw's ClawHub)
 */

import { useState, useMemo } from 'react';
import { useGateway } from '../../gateway/useGateway';
import type { Skill, SkillCategory } from '../../gateway/SkillsManager';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  productivity: '📊 Productivité',
  development: '💻 Développement',
  communication: '💬 Communication',
  automation: '⚙️ Automatisation',
  integration: '🔗 Intégrations',
  utility: '🔧 Utilitaires',
  custom: '🎨 Personnalisés'
};

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  productivity: '#3b82f6',
  development: '#8b5cf6',
  communication: '#10b981',
  automation: '#f59e0b',
  integration: '#ec4899',
  utility: '#6b7280',
  custom: '#06b6d4'
};

export function SkillsPanel() {
  const { skills, enabledSkills, enableSkill, disableSkill, installSkill } = useGateway();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [newSkillId, setNewSkillId] = useState('');

  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [skills, searchQuery, selectedCategory]);

  const isEnabled = (skillId: string) => enabledSkills.some(s => s.id === skillId);

  const handleToggleSkill = (skill: Skill) => {
    if (isEnabled(skill.id)) {
      disableSkill(skill.id);
    } else {
      enableSkill(skill.id);
    }
  };

  const handleInstallSkill = async () => {
    if (!newSkillId.trim()) return;
    try {
      await installSkill(newSkillId.trim());
      setNewSkillId('');
      setInstallDialogOpen(false);
    } catch (error) {
      console.error('Failed to install skill:', error);
    }
  };

  const categories = Object.entries(CATEGORY_LABELS) as [SkillCategory, string][];

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            🔧 Skills
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>
            {enabledSkills.length} skills actifs sur {skills.length}
          </p>
        </div>
        <button
          onClick={() => setInstallDialogOpen(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Installer un skill
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un skill..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '12px 16px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px'
          }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as SkillCategory | 'all')}
          style={{
            padding: '12px 16px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">Toutes catégories</option>
          {categories.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Skills Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {filteredSkills.map(skill => (
          <SkillCard
            key={skill.id}
            skill={skill}
            enabled={isEnabled(skill.id)}
            onToggle={() => handleToggleSkill(skill)}
          />
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#666'
        }}>
          <p style={{ fontSize: '1.2rem' }}>Aucun skill trouvé</p>
          <p>Essayez une autre recherche ou catégorie</p>
        </div>
      )}

      {/* Install Dialog */}
      {installDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            border: '1px solid #333'
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>
              ➕ Installer un skill
            </h2>
            <input
              type="text"
              placeholder="ID du skill (ex: github-integration)"
              value={newSkillId}
              onChange={(e) => setNewSkillId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setInstallDialogOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#888',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleInstallSkill}
                disabled={!newSkillId.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: newSkillId.trim() ? '#3b82f6' : '#333',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: newSkillId.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Installer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SkillCardProps {
  skill: Skill;
  enabled: boolean;
  onToggle: () => void;
}

function SkillCard({ skill, enabled, onToggle }: SkillCardProps) {
  const categoryColor = CATEGORY_COLORS[skill.category];
  const toolCount = skill.manifest.tools?.length || 0;

  return (
    <div style={{
      backgroundColor: '#2a2a2a',
      borderRadius: '12px',
      padding: '20px',
      border: enabled ? `2px solid ${categoryColor}` : '2px solid transparent',
      transition: 'all 0.2s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            {skill.name}
          </h3>
          <span style={{
            fontSize: '12px',
            color: categoryColor,
            fontWeight: 500
          }}>
            {CATEGORY_LABELS[skill.category]}
          </span>
        </div>
        <button
          onClick={onToggle}
          style={{
            width: '48px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: enabled ? '#10b981' : '#333',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.2s ease'
          }}
        >
          <span style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '26px' : '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'white',
            transition: 'left 0.2s ease'
          }} />
        </button>
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 16px',
        color: '#999',
        fontSize: '14px',
        lineHeight: 1.5
      }}>
        {skill.description}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#666'
      }}>
        <span>v{skill.version}</span>
        <span>{toolCount} tool{toolCount !== 1 ? 's' : ''}</span>
        <span>{skill.author}</span>
      </div>

      {/* Permissions */}
      {skill.config.permissions && skill.config.permissions.length > 0 && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #333'
        }}>
          <span style={{ fontSize: '11px', color: '#666' }}>
            🔐 {skill.config.permissions.length} permission{skill.config.permissions.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default SkillsPanel;
