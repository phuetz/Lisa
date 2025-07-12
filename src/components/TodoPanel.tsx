import { useVisionAudioStore } from '../store/visionAudioStore';
import { useTranslation } from 'react-i18next';
import { agentRegistry } from '../agents/registry';

export default function TodoPanel() {
  const { t } = useTranslation();
  const { todos } = useVisionAudioStore();
  const todoAgent = agentRegistry.getAgent('TodoAgent');

  const removeTodo = (id: string) => {
    if (todoAgent) {
      todoAgent.execute({ command: 'remove_item', id });
    } else {
      console.error('TodoAgent not found');
    }
  };

  if (!todos.length) return null;

  const ariaLabel = t('todo_panel');

  return (
    <div role="region" aria-live="polite" aria-label={ariaLabel} style={{ position: 'absolute', right: 10, bottom: 10, background: '#ffffffcc', padding: 8, borderRadius: 6, fontSize: 12 }}>
      <strong>{t('to_do')}</strong>
      <ul role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {todos.map((todo) => (
          <li role="listitem" key={todo.id}>
            {todo.text}{' '}
            <button aria-label={t('delete')} style={{ fontSize: 10 }} onClick={() => removeTodo(todo.id)}>🗑</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
