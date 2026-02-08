import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';
import { useMcpClient } from '../hooks';

export default function AppsPanel() {
  const { t } = useTranslation();
  const intent = useAppStore(s => s.intent);
  const intentPayload = useAppStore(s => s.intentPayload);
  const setState = useAppStore(s=>s.setState);
  const { readResource } = useMcpClient();

  if (intent !== 'mcp_list' || !intentPayload || !('resources' in intentPayload)) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resources = (intentPayload as any).resources as { uri: string; name?: string; type?: string }[];

  return (
    <div role="region" aria-live="polite" aria-label={t('mcp_resources')} style={{
      position: 'absolute',
      right: 10,
      top: 10,
      width: 250,
      maxHeight: 300,
      overflow: 'auto',
      background: 'var(--bg-elevated, #2f2f2f)',
      color: 'var(--text-primary, #ececec)',
      border: '1px solid var(--border-primary, #424242)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: 10,
      boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))',
    }}>
      <h4 style={{ margin: '4px 0', color: 'var(--text-primary, #ececec)' }}>{t('mcp_resources')}</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {resources.map((r) => (
          <li
            key={r.uri}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                readResource('memory', r.uri).then(data => setState({ intent:'mcp_open', intentPayload:data }));
              }
            }}
            style={{
              margin: '2px 0',
              padding: '6px 8px',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm, 4px)',
              transition: 'background-color var(--transition-fast, 0.15s ease)',
            }}
            onClick={async () => {
              const data = await readResource('memory', r.uri);
              setState({ intent:'mcp_open', intentPayload:data });
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.06))')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <strong>{r.name ?? r.uri}</strong>
            {r.type && <span style={{ color: 'var(--text-muted, #666)' }}> ({r.type})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
