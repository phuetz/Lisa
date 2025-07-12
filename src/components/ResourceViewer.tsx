import React from 'react';
import { useTranslation } from 'react-i18next';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ReactJson from 'react-json-view';

/**
 * Slide-up panel that renders the content of an MCP resource when the store
 * intent is `mcp_open`.
 */
export default function ResourceViewer() {
  const { t } = useTranslation();
  const { intent, intentPayload, setState } = useVisionAudioStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(intent === 'mcp_open');
  }, [intent]);

  if (!visible) return null;

  const close = () => setState({ intent: undefined, intentPayload: undefined });

  // Detect mime / content type heuristically
  const payload = intentPayload as any;
  let render: React.ReactNode;

  if (typeof payload === 'string') {
    // Try JSON first
    try {
      const obj = JSON.parse(payload);
      render = <ReactJson src={obj} collapsed={2} name={false} />;
    } catch {
      // Treat as markdown / plain text
      render = <ReactMarkdown>{payload}</ReactMarkdown>;
    }
  } else if (typeof payload === 'object') {
    render = <ReactJson src={payload} collapsed={2} name={false} />;
  } else {
    render = <pre>{String(payload)}</pre>;
  }

  return (
    <div role="dialog" aria-label={t('resource_viewer')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70%', background: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, boxShadow: '0 -4px 16px rgba(0,0,0,.2)', overflowY: 'auto', padding: 16, zIndex: 1000 }}>
      <button aria-label={t('close')} onClick={close} style={{ position: 'absolute', top: 8, right: 12, background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
      <div style={{ paddingTop: 24 }}>
        {render}
      </div>
    </div>
  );
}
