/**
 * Lisa Skills Registry Panel
 * ClawHub-like skill management UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getSkillsRegistry } from '../../gateway';
import type { Skill, SkillCategory } from '../../gateway/SkillsRegistry';

export function SkillsRegistryPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<{ category: SkillCategory; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = useCallback(() => {
    const registry = getSkillsRegistry();
    const filter: { category?: SkillCategory; search?: string } = {};
    if (selectedCategory !== 'all') filter.category = selectedCategory;
    if (searchQuery) filter.search = searchQuery;
    
    setSkills(registry.listSkills(filter));
    setCategories(registry.getCategories());
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleToggleSkill = (skillId: string, enabled: boolean) => {
    const registry = getSkillsRegistry();
    if (enabled) {
      registry.disable(skillId);
    } else {
      registry.enable(skillId);
    }
    refreshData();
  };

  const getCategoryIcon = (cat: SkillCategory) => {
    const icons: Record<SkillCategory, string> = {
      productivity: '📊', communication: '💬', development: '💻',
      data: '📈', automation: '⚡', media: '🎨',
      integration: '🔗', utility: '🔧', custom: '⭐'
    };
    return icons[cat] || '📦';
  };

  const stats = getSkillsRegistry().getStats();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📦 Skills Registry</h2>
        <span style={styles.badge}>{stats.enabledSkills}/{stats.totalSkills} actifs</span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Rechercher un skill..."
        style={styles.searchInput}
      />

      {/* Categories */}
      <div style={styles.categories}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{ ...styles.catButton, ...(selectedCategory === 'all' ? styles.catButtonActive : {}) }}
        >
          Tous ({stats.totalSkills})
        </button>
        {categories.slice(0, 5).map(({ category, count }) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{ ...styles.catButton, ...(selectedCategory === category ? styles.catButtonActive : {}) }}
          >
            {getCategoryIcon(category)} {category} ({count})
          </button>
        ))}
      </div>

      {/* Skills List */}
      <div style={styles.skillsList}>
        {skills.map((skill) => (
          <div key={skill.id} style={styles.skillCard}>
            <div style={styles.skillIcon}>{skill.icon || '📦'}</div>
            <div style={styles.skillInfo}>
              <div style={styles.skillHeader}>
                <span style={styles.skillName}>{skill.name}</span>
                <span style={styles.skillVersion}>v{skill.version}</span>
              </div>
              <div style={styles.skillDesc}>{skill.description}</div>
              <div style={styles.skillMeta}>
                <span style={styles.skillSource}>{skill.source}</span>
                {skill.rating && <span style={styles.skillRating}>⭐ {skill.rating}</span>}
                <span style={styles.skillUsage}>{skill.usageCount} uses</span>
              </div>
            </div>
            <button
              onClick={() => handleToggleSkill(skill.id, skill.status === 'enabled')}
              style={{
                ...styles.toggleButton,
                backgroundColor: skill.status === 'enabled' ? '#10b981' : '#333'
              }}
            >
              {skill.status === 'enabled' ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.bundledSkills}</span>
          <span style={styles.statLabel}>Bundled</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.workspaceSkills}</span>
          <span style={styles.statLabel}>Workspace</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.totalUsage}</span>
          <span style={styles.statLabel}>Total Usage</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a1a', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  badge: { padding: '4px 12px', backgroundColor: '#252525', borderRadius: '12px', fontSize: '12px', color: '#888' },
  searchInput: { width: '100%', padding: '12px 16px', backgroundColor: '#252525', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
  categories: { display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' },
  catButton: { padding: '8px 14px', backgroundColor: '#252525', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', textTransform: 'capitalize' },
  catButtonActive: { backgroundColor: '#3b82f6', color: '#fff' },
  skillsList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' },
  skillCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', backgroundColor: '#252525', borderRadius: '10px' },
  skillIcon: { fontSize: '28px' },
  skillInfo: { flex: 1 },
  skillHeader: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  skillName: { fontSize: '15px', fontWeight: 600 },
  skillVersion: { fontSize: '11px', color: '#666' },
  skillDesc: { fontSize: '12px', color: '#888', marginTop: '4px' },
  skillMeta: { display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#666' },
  skillSource: { textTransform: 'capitalize' },
  skillRating: { color: '#f59e0b' },
  skillUsage: {},
  toggleButton: { padding: '8px 14px', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' },
  stats: { display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #333' },
  statItem: { flex: 1, textAlign: 'center' },
  statValue: { display: 'block', fontSize: '20px', fontWeight: 700, color: '#3b82f6' },
  statLabel: { fontSize: '11px', color: '#888' }
};

export default SkillsRegistryPanel;
