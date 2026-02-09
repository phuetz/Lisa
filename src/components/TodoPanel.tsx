import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';

export default function TodoPanel() {
  const { t } = useTranslation();
  const todos = useAppStore((s) => s.todos);
  const removeTodo = useAppStore((s) => s.removeTodo);

  if (!todos.length) return null;

  return (
    <div role="region" aria-live="polite" aria-label={t('todo_panel')} style={{
      position: 'absolute',
      right: 10,
      bottom: 10,
      background: 'var(--bg-panel, #1a1a26)',
      color: 'var(--text-primary, #e8e8f0)',
      border: '1px solid var(--border-primary, #2d2d44)',
      padding: 10,
      borderRadius: 'var(--radius-md, 8px)',
      fontSize: 12,
      boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))',
    }}>
      <strong style={{ color: 'var(--text-secondary, #9898b0)' }}>{t('to_do')}</strong>
      <ul role="list" style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
        {todos.map((todo) => (
          <li role="listitem" key={todo.id} style={{ padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{todo.text}</span>
            <button aria-label={t('delete')} className="msg-action-btn" style={{ fontSize: 10, padding: '2px 4px', minWidth: 'auto', width: 'auto', height: 'auto' }} onClick={() => removeTodo(todo.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
