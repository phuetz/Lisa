import { useVisionAudioStore } from '../store/visionAudioStore';
import { useTranslation } from 'react-i18next';
import { useMcpClient } from '../hooks';

export default function AppsPanel() {
  const { t } = useTranslation();
  const { intent, intentPayload } = useVisionAudioStore();

  if (intent !== 'mcp_list' || !intentPayload || !('resources' in intentPayload)) return null;

  const resources = (intentPayload as any).resources as { uri: string; name?: string; type?: string }[];
  const setState = useVisionAudioStore(s=>s.setState);
  const { readResource } = useMcpClient();

  return (
    <div role="region" aria-live="polite" aria-label={t('mcp_resources')} style={{ position: 'absolute', right: 10, top: 10, width: 250, maxHeight: 300, overflow: 'auto', background: '#ffffffdd', borderRadius: 8, padding: 8 }}>
      <h4 style={{ margin: '4px 0' }}>{t('mcp_resources')}</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {resources.map((r) => (
          <li key={r.uri} style={{ margin: '4px 0', fontSize: 12, cursor:'pointer' }} onClick={async ()=>{
            const data = await readResource('memory', r.uri);
            setState({ intent:'mcp_open', intentPayload:data });
          }}>
            <strong>{r.name ?? r.uri}</strong>
            {r.type && <span style={{ color: '#666' }}> ({r.type})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
