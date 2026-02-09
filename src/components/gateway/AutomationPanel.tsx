/**
 * Lisa Automation Panel
 * UI for managing Cron jobs and Webhooks
 * Inspired by OpenClaw's automation system
 */

import { useState, useEffect } from 'react';
import { getCronManager, getWebhookManager, PREDEFINED_SCHEDULES } from '../../gateway';
import type { CronJob, Webhook } from '../../gateway';

type TabType = 'cron' | 'webhooks';

export function AutomationPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('cron');
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreateCron, setShowCreateCron] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);

  const cronManager = getCronManager();
  const webhookManager = getWebhookManager();

  useEffect(() => {
    // Load initial data
    setCronJobs(cronManager.listJobs());
    setWebhooks(webhookManager.listWebhooks());

    // Start cron manager
    cronManager.start();

    // Listen for updates
    const handleCronCreated = (job: CronJob) => setCronJobs(prev => [...prev, job]);
    const handleCronDeleted = ({ id }: { id: string }) => setCronJobs(prev => prev.filter(j => j.id !== id));
    const handleWebhookCreated = (webhook: Webhook) => setWebhooks(prev => [...prev, webhook]);
    const handleWebhookDeleted = ({ id }: { id: string }) => setWebhooks(prev => prev.filter(w => w.id !== id));

    cronManager.on('job:created', handleCronCreated);
    cronManager.on('job:deleted', handleCronDeleted);
    webhookManager.on('webhook:created', handleWebhookCreated);
    webhookManager.on('webhook:deleted', handleWebhookDeleted);

    return () => {
      cronManager.off('job:created', handleCronCreated);
      cronManager.off('job:deleted', handleCronDeleted);
      webhookManager.off('webhook:created', handleWebhookCreated);
      webhookManager.off('webhook:deleted', handleWebhookDeleted);
    };
  }, [cronManager, webhookManager]);

  const handleToggleCron = (id: string, enabled: boolean) => {
    if (enabled) {
      cronManager.disableJob(id);
    } else {
      cronManager.enableJob(id);
    }
    setCronJobs(cronManager.listJobs());
  };

  const handleDeleteCron = (id: string) => {
    cronManager.deleteJob(id);
  };

  const handleToggleWebhook = (id: string, enabled: boolean) => {
    if (enabled) {
      webhookManager.disableWebhook(id);
    } else {
      webhookManager.enableWebhook(id);
    }
    setWebhooks(webhookManager.listWebhooks());
  };

  const handleDeleteWebhook = (id: string) => {
    webhookManager.deleteWebhook(id);
  };

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#1a1a26',
      minHeight: '100vh',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
          ⚡ Automation
        </h1>
        <p style={{ color: '#6a6a82', margin: '4px 0 0' }}>
          Tâches planifiées et webhooks pour intégrations externes
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #2d2d44',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('cron')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'cron' ? '#3b82f6' : 'transparent',
            color: activeTab === 'cron' ? 'white' : '#6a6a82',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⏰ Tâches Cron ({cronJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeTab === 'webhooks' ? '#3b82f6' : 'transparent',
            color: activeTab === 'webhooks' ? 'white' : '#6a6a82',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔗 Webhooks ({webhooks.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'cron' && (
        <CronTab
          jobs={cronJobs}
          onToggle={handleToggleCron}
          onDelete={handleDeleteCron}
          onShowCreate={() => setShowCreateCron(true)}
        />
      )}

      {activeTab === 'webhooks' && (
        <WebhooksTab
          webhooks={webhooks}
          onToggle={handleToggleWebhook}
          onDelete={handleDeleteWebhook}
          onShowCreate={() => setShowCreateWebhook(true)}
        />
      )}

      {/* Create Cron Dialog */}
      {showCreateCron && (
        <CreateCronDialog
          onClose={() => setShowCreateCron(false)}
          onCreate={(job) => {
            setCronJobs(prev => [...prev, job]);
            setShowCreateCron(false);
          }}
        />
      )}

      {/* Create Webhook Dialog */}
      {showCreateWebhook && (
        <CreateWebhookDialog
          onClose={() => setShowCreateWebhook(false)}
          onCreate={(webhook) => {
            setWebhooks(prev => [...prev, webhook]);
            setShowCreateWebhook(false);
          }}
        />
      )}
    </div>
  );
}

// Cron Tab
interface CronTabProps {
  jobs: CronJob[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onShowCreate: () => void;
}

function CronTab({ jobs, onToggle, onDelete, onShowCreate }: CronTabProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={onShowCreate}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ➕ Nouvelle tâche
        </button>
      </div>

      {jobs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          color: '#6a6a82'
        }}>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Aucune tâche planifiée</p>
          <p>Créez une tâche cron pour automatiser des actions</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {jobs.map(job => (
            <div key={job.id} style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontWeight: 600 }}>{job.name}</h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: job.enabled ? '#10b98120' : '#6b728020',
                    color: job.enabled ? '#10b981' : '#6b7280'
                  }}>
                    {job.enabled ? '● Actif' : '○ Inactif'}
                  </span>
                </div>
                <div style={{ color: '#6a6a82', fontSize: '14px', marginTop: '4px' }}>
                  <code style={{ backgroundColor: '#2d2d44', padding: '2px 6px', borderRadius: '4px' }}>
                    {job.schedule}
                  </code>
                  <span style={{ marginLeft: '12px' }}>
                    {job.runCount} exécution{job.runCount !== 1 ? 's' : ''}
                  </span>
                  {job.nextRun && (
                    <span style={{ marginLeft: '12px' }}>
                      Prochaine: {new Date(job.nextRun).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onToggle(job.id, job.enabled)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: job.enabled ? '#f59e0b20' : '#10b98120',
                    color: job.enabled ? '#f59e0b' : '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {job.enabled ? 'Désactiver' : 'Activer'}
                </button>
                <button
                  onClick={() => onDelete(job.id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#ef444420',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Webhooks Tab
interface WebhooksTabProps {
  webhooks: Webhook[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onShowCreate: () => void;
}

function WebhooksTab({ webhooks, onToggle, onDelete, onShowCreate }: WebhooksTabProps) {
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(`http://localhost:3001${url}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button
          onClick={onShowCreate}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          ➕ Nouveau webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          color: '#6a6a82'
        }}>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Aucun webhook configuré</p>
          <p>Créez un webhook pour recevoir des notifications externes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {webhooks.map(webhook => (
            <div key={webhook.id} style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontWeight: 600 }}>{webhook.name}</h3>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: webhook.enabled ? '#10b98120' : '#6b728020',
                      color: webhook.enabled ? '#10b981' : '#6b7280'
                    }}>
                      {webhook.enabled ? '● Actif' : '○ Inactif'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    backgroundColor: '#2d2d44',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    <code style={{ fontSize: '13px', color: '#10b981' }}>
                      POST http://localhost:3001{webhook.url}
                    </code>
                    <button
                      onClick={() => copyUrl(webhook.url)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#3b82f620',
                        color: '#3b82f6',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📋 Copier
                    </button>
                  </div>
                  <div style={{ color: '#6a6a82', fontSize: '13px', marginTop: '8px' }}>
                    {webhook.triggerCount} déclenchement{webhook.triggerCount !== 1 ? 's' : ''}
                    {webhook.lastTriggered && (
                      <span style={{ marginLeft: '12px' }}>
                        Dernier: {new Date(webhook.lastTriggered).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onToggle(webhook.id, webhook.enabled)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: webhook.enabled ? '#f59e0b20' : '#10b98120',
                      color: webhook.enabled ? '#f59e0b' : '#10b981',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {webhook.enabled ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => onDelete(webhook.id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#ef444420',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Cron Dialog
interface CreateCronDialogProps {
  onClose: () => void;
  onCreate: (job: CronJob) => void;
}

function CreateCronDialog({ onClose, onCreate }: CreateCronDialogProps) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState<string>(PREDEFINED_SCHEDULES.everyHour);
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    
    const cronManager = getCronManager();
    const job = cronManager.createJob({
      name: name.trim(),
      schedule: useCustom ? customSchedule : schedule,
      enabled: true,
      action: {
        type: 'message',
        config: {
          sessionId: 'default',
          content: `Tâche planifiée: ${name}`
        }
      }
    });
    
    onCreate(job);
  };

  return (
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
        backgroundColor: '#1a1a26',
        borderRadius: '12px',
        padding: '24px',
        width: '450px',
        maxWidth: '90%',
        border: '1px solid #2d2d44'
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>
          ➕ Nouvelle tâche Cron
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
            Nom
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Rapport quotidien"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
            Planification
          </label>
          <select
            value={useCustom ? 'custom' : schedule}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustom(true);
              } else {
                setUseCustom(false);
                setSchedule(e.target.value);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            <option value={PREDEFINED_SCHEDULES.everyMinute}>Chaque minute</option>
            <option value={PREDEFINED_SCHEDULES.every5Minutes}>Toutes les 5 minutes</option>
            <option value={PREDEFINED_SCHEDULES.every15Minutes}>Toutes les 15 minutes</option>
            <option value={PREDEFINED_SCHEDULES.everyHour}>Chaque heure</option>
            <option value={PREDEFINED_SCHEDULES.everyDay9am}>Tous les jours à 9h</option>
            <option value={PREDEFINED_SCHEDULES.everyDay6pm}>Tous les jours à 18h</option>
            <option value={PREDEFINED_SCHEDULES.everyMonday9am}>Chaque lundi à 9h</option>
            <option value={PREDEFINED_SCHEDULES.weekdaysOnly9am}>Jours ouvrés à 9h</option>
            <option value="custom">Expression personnalisée...</option>
          </select>
        </div>

        {useCustom && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
              Expression Cron
            </label>
            <input
              type="text"
              value={customSchedule}
              onChange={(e) => setCustomSchedule(e.target.value)}
              placeholder="*/30 * * * * (toutes les 30 min)"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #2d2d44',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ fontSize: '12px', color: '#6a6a82', margin: '6px 0 0' }}>
              Format: minute heure jour mois jour_semaine
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#6a6a82',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: name.trim() ? '#3b82f6' : '#2d2d44',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: name.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Webhook Dialog
interface CreateWebhookDialogProps {
  onClose: () => void;
  onCreate: (webhook: Webhook) => void;
}

function CreateWebhookDialog({ onClose, onCreate }: CreateWebhookDialogProps) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('github');
  const [secret, setSecret] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    
    const webhookManager = getWebhookManager();
    let webhook: Webhook;

    switch (template) {
      case 'github':
        webhook = webhookManager.createGitHubWebhook(name.trim(), 'default');
        break;
      case 'slack':
        webhook = webhookManager.createSlackWebhook(name.trim(), 'default');
        break;
      default:
        webhook = webhookManager.createGenericWebhook(name.trim(), 'webhook:received');
    }

    if (secret) {
      webhookManager.updateWebhook(webhook.id, { secret });
    }
    
    onCreate(webhook);
  };

  return (
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
        backgroundColor: '#1a1a26',
        borderRadius: '12px',
        padding: '24px',
        width: '450px',
        maxWidth: '90%',
        border: '1px solid #2d2d44'
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>
          ➕ Nouveau Webhook
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
            Nom
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: GitHub Notifications"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
            Template
          </label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            <option value="github">GitHub</option>
            <option value="slack">Slack</option>
            <option value="generic">Générique</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: '#6a6a82', fontSize: '14px' }}>
            Secret (optionnel)
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Secret pour vérification"
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#6a6a82',
              border: '1px solid #2d2d44',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: name.trim() ? '#3b82f6' : '#2d2d44',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: name.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutomationPanel;
