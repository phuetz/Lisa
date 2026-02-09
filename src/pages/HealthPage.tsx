/**
 * Health Page - Monitoring Sante
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Heart, Activity, AlertTriangle, Bell, Check,
  Droplets, Pill, Clock, TrendingUp, Shield
} from 'lucide-react';
import {
  healthMonitoringService,
  type HealthAlert,
  type DailyHealthSummary
} from '../services/HealthMonitoringService';

const AlertCard = ({
  alert,
  onAction,
}: {
  alert: HealthAlert;
  onAction: (alertId: string, actionType: string) => void;
}) => {
  const severityColors = {
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', icon: '#3b82f6' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', icon: '#f59e0b' },
    critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: '#ef4444' },
  };

  const sColors = severityColors[alert.severity];

  return (
    <div
      role="alert"
      style={{
        padding: '16px',
        backgroundColor: sColors.bg,
        borderRadius: '12px',
        border: `1px solid ${sColors.border}`,
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <AlertTriangle size={24} color={sColors.icon} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {alert.title}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            {alert.message}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7, margin: '8px 0 0 0' }}>
            {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>
      {alert.actions && alert.actions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginLeft: '36px' }}>
          {alert.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => onAction(alert.id, action.type)}
              style={{
                padding: '8px 14px',
                backgroundColor: index === 0 ? sColors.icon : 'transparent',
                color: index === 0 ? '#fff' : sColors.icon,
                border: index === 0 ? 'none' : `1px solid ${sColors.icon}`,
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  icon: typeof Heart;
  color: string;
  suffix?: string;
}) => (
  <div
    style={{
      padding: '20px',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: '12px',
      border: '1px solid var(--border-primary)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</p>
        <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {value}{suffix}
        </p>
      </div>
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} />
      </div>
    </div>
  </div>
);

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  color: string;
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '16px',
      backgroundColor: 'var(--bg-panel)',
      border: '1px solid var(--border-primary)',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '100%',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={24} color={color} />
    </div>
    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{label}</span>
  </button>
);

export default function HealthPage() {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [summary, setSummary] = useState<DailyHealthSummary | null>(null);

  useEffect(() => {
    setAlerts(healthMonitoringService.getActiveAlerts());
    setSummary(healthMonitoringService.getDailySummary());

    const unsubscribe = healthMonitoringService.subscribe(setAlerts);
    return unsubscribe;
  }, []);

  const handleAlertAction = useCallback(async (alertId: string, actionType: string) => {
    await healthMonitoringService.executeAlertAction(alertId, actionType);
    setAlerts(healthMonitoringService.getActiveAlerts());
  }, []);

  const handleRecordActivity = useCallback(() => {
    healthMonitoringService.recordActivity();
    setSummary(healthMonitoringService.getDailySummary());
  }, []);

  const handleHydrationReminder = useCallback(() => {
    healthMonitoringService.createHydrationReminder();
    setAlerts(healthMonitoringService.getActiveAlerts());
  }, []);

  const handleMedicationReminder = useCallback(() => {
    healthMonitoringService.createMedicationReminder('Medicament', new Date().toLocaleTimeString());
    setAlerts(healthMonitoringService.getActiveAlerts());
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Sante</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Surveillance et alertes proactives</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Score Activite"
          value={summary?.activityScore || 0}
          icon={Activity}
          color="var(--color-accent, #f5a623)"
          suffix="%"
        />
        <StatCard
          label="Risque Chute"
          value={summary?.fallRiskScore || 0}
          icon={Shield}
          color={summary?.fallRiskScore && summary.fallRiskScore > 50 ? 'var(--color-error, #ef4444)' : 'var(--color-accent, #f5a623)'}
          suffix="%"
        />
        <StatCard
          label="Hydratation"
          value={summary?.hydrationLevel || 0}
          icon={Droplets}
          color="var(--color-info, #3b82f6)"
          suffix="%"
        />
        <StatCard
          label="Alertes Aujourd'hui"
          value={summary?.alerts || 0}
          icon={Bell}
          color="var(--color-warning, #f59e0b)"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
      }}>
        {/* Alerts Section */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <AlertTriangle size={20} color="var(--color-warning, #f59e0b)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Alertes Actives
            </h3>
            {alerts.length > 0 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: 'var(--color-error, #ef4444)',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '12px',
              }}>
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length > 0 ? (
            alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAction={handleAlertAction}
              />
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-secondary)',
            }}>
              <Check size={48} style={{ marginBottom: '12px', color: 'var(--color-accent, #f5a623)' }} />
              <p style={{ fontSize: '15px', margin: 0 }}>Aucune alerte active</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Tout va bien !</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border-primary)',
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 16px 0'
          }}>
            Actions Rapides
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <QuickAction
              icon={Activity}
              label="Je suis actif"
              onClick={handleRecordActivity}
              color="var(--color-accent, #f5a623)"
            />
            <QuickAction
              icon={Droplets}
              label="Rappel eau"
              onClick={handleHydrationReminder}
              color="var(--color-info, #3b82f6)"
            />
            <QuickAction
              icon={Pill}
              label="Medicament"
              onClick={handleMedicationReminder}
              color="var(--color-purple, #8b5cf6)"
            />
            <QuickAction
              icon={Clock}
              label="Historique"
              onClick={() => {}}
              color="var(--color-warning, #f59e0b)"
            />
          </div>

          {/* Emergency Button */}
          <button
            aria-label="Appel d'urgence"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              marginTop: '16px',
              backgroundColor: 'var(--color-error, #ef4444)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity var(--transition-fast, 0.15s ease)',
            }}
          >
            <AlertTriangle size={20} aria-hidden="true" />
            Appel d'Urgence
          </button>
        </div>
      </div>

      {/* Daily Timeline */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
        }}>
          <TrendingUp size={20} color="var(--color-accent, #f5a623)" />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Resume du Jour
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '10px' }}>
            <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-accent, #f5a623)', margin: 0 }}>
              {summary?.activityScore || 0}%
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Activite</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '10px' }}>
            <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-info, #3b82f6)', margin: 0 }}>
              {summary?.hydrationLevel || 0}%
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hydratation</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '10px' }}>
            <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-purple, #8b5cf6)', margin: 0 }}>
              {summary?.medicationAdherence || 0}%
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Medicaments</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--bg-panel)', borderRadius: '10px' }}>
            <p style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-warning, #f59e0b)', margin: 0 }}>
              {summary?.alerts || 0}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Alertes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
