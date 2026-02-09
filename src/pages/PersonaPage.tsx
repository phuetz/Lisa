/**
 * PersonaPage
 * Page de gestion des personas Lisa - AudioReader Studio design
 */

import React from 'react';
import {
  User,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  Eye,
  Ear,
  Code,
  Search,
  Brain,
} from 'lucide-react';
import { usePersonaStore } from '../store/personaStore';
import { PersonaBuilder } from '../components/PersonaBuilder';

export const PersonaPage: React.FC = () => {
  const {
    personas,
    activePersonaId,
    setActivePersona,
    startEditing,
    deletePersona,
    duplicatePersona,
    exportPersona,
    importPersona,
    isEditing,
  } = usePersonaStore();

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          importPersona(data);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = (id: string, name: string) => {
    const data = exportPersona(id);
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-persona.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Personas Lisa
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            Créez et gérez différentes personnalités pour Lisa
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleImport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          >
            <Upload size={16} />
            Importer
          </button>
          <button
            onClick={() => startEditing()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--bg-deep)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <Plus size={16} />
            Créer un Persona
          </button>
        </div>
      </div>

      {/* Persona Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
        }}
      >
        {personas.map((persona) => {
          const isActive = persona.id === activePersonaId;
          return (
            <div
              key={persona.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--border-primary)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
            >
              <div style={{ padding: '20px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: isActive ? 'var(--color-accent)' : 'var(--bg-panel)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--bg-deep)' : 'var(--text-muted)',
                      fontSize: '20px',
                      fontWeight: 600,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {persona.avatar ? (
                      <img
                        src={persona.avatar}
                        alt={persona.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      persona.name[0]
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {persona.name}
                      </span>
                      {isActive && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            backgroundColor: 'rgba(245, 166, 35, 0.15)',
                            color: 'var(--color-accent)',
                            border: '1px solid rgba(245, 166, 35, 0.3)',
                            borderRadius: '6px',
                          }}
                        >
                          <Check size={10} />
                          Actif
                        </span>
                      )}
                      {persona.isDefault && (
                        <span
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            backgroundColor: 'rgba(152, 152, 176, 0.15)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(152, 152, 176, 0.3)',
                            borderRadius: '6px',
                          }}
                        >
                          Défaut
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {persona.description}
                    </p>
                  </div>
                </div>

                {/* Capabilities */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {persona.capabilities.vision && (
                    <CapabilityChip icon={<Eye size={12} />} label="Vision" />
                  )}
                  {persona.capabilities.hearing && (
                    <CapabilityChip icon={<Ear size={12} />} label="Ouïe" />
                  )}
                  {persona.capabilities.codeInterpreter && (
                    <CapabilityChip icon={<Code size={12} />} label="Code" />
                  )}
                  {persona.capabilities.webSearch && (
                    <CapabilityChip icon={<Search size={12} />} label="Web" />
                  )}
                  {persona.capabilities.memory && (
                    <CapabilityChip icon={<Brain size={12} />} label="Mémoire" />
                  )}
                </div>

                {/* Personality */}
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  {persona.personality.formality === 'casual'
                    ? 'Décontracté'
                    : persona.personality.formality === 'formal'
                    ? 'Formel'
                    : 'Équilibré'}
                  {' · '}
                  {persona.personality.empathy === 'high'
                    ? 'Empathique'
                    : persona.personality.empathy === 'minimal'
                    ? 'Neutre'
                    : 'Équilibré'}
                </p>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-primary)',
                }}
              >
                <button
                  onClick={() => setActivePersona(persona.id)}
                  disabled={isActive}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    borderRadius: '6px',
                    cursor: isActive ? 'default' : 'pointer',
                    border: isActive ? '1px solid var(--border-primary)' : 'none',
                    backgroundColor: isActive ? 'transparent' : 'var(--color-accent)',
                    color: isActive ? 'var(--text-muted)' : 'var(--bg-deep)',
                    opacity: isActive ? 0.5 : 1,
                  }}
                >
                  {isActive ? 'Actif' : 'Activer'}
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <IconBtn title="Modifier" onClick={() => startEditing(persona)}>
                    <Pencil size={14} />
                  </IconBtn>
                  <IconBtn title="Dupliquer" onClick={() => duplicatePersona(persona.id)}>
                    <Copy size={14} />
                  </IconBtn>
                  <IconBtn title="Exporter" onClick={() => handleExport(persona.id, persona.name)}>
                    <Download size={14} />
                  </IconBtn>
                  {!persona.isDefault && (
                    <IconBtn title="Supprimer" onClick={() => deletePersona(persona.id)} danger>
                      <Trash2 size={14} />
                    </IconBtn>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add New Card */}
        <div
          onClick={() => startEditing()}
          style={{
            minHeight: '280px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--border-primary)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Plus
              size={40}
              style={{ color: 'var(--text-muted)', marginBottom: '8px' }}
            />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Créer un Persona
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Personnalisez Lisa selon vos besoins
            </p>
          </div>
        </div>
      </div>

      {/* Persona Builder Modal */}
      {isEditing && <PersonaBuilder />}
    </div>
  );
};

function CapabilityChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        color: 'var(--color-cyan)',
        border: '1px solid rgba(6, 182, 212, 0.2)',
        borderRadius: '6px',
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title.toLowerCase()}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: danger ? 'var(--color-red)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export default PersonaPage;
