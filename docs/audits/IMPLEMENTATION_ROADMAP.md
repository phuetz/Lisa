# 🚀 Roadmap d'Implémentation - Modernisation UI

**Date de début**: 6 Novembre 2025  
**Durée estimée**: 7-10 jours  
**Score actuel**: 6.5/10  
**Score cible**: 9.5/10

---

## 📅 Planning Détaillé

### PHASE 1: Interface Chat Fullscreen (Jours 1-3)
**Priorité**: ⭐⭐⭐ CRITIQUE  
**Durée**: 2-3 jours  
**Score cible**: 7.5/10

---

#### Jour 1 - Matin (4h): Structure de Base

**1.1 Créer ChatLayout.tsx**
```bash
# Créer le fichier
touch src/components/chat/ChatLayout.tsx
```

```tsx
// src/components/chat/ChatLayout.tsx
import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatMain } from './ChatMain';
import { InfoPanel } from './InfoPanel';

export const ChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar gauche - Historique */}
      <ChatSidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      {/* Zone principale - Chat */}
      <ChatMain 
        onToggleInfo={() => setInfoPanelOpen(!infoPanelOpen)} 
      />
      
      {/* Panel droit - Info (optionnel) */}
      {infoPanelOpen && (
        <InfoPanel 
          onClose={() => setInfoPanelOpen(false)} 
        />
      )}
    </div>
  );
};
```

**1.2 Créer ChatSidebar.tsx**
```tsx
// src/components/chat/ChatSidebar.tsx
interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatSidebar = ({ isOpen, onToggle }: ChatSidebarProps) => {
  return (
    <aside 
      className={`
        ${isOpen ? 'w-[280px]' : 'w-[64px]'} 
        transition-all duration-300 
        bg-[#1a1a1a] border-r border-[#404040]
        flex flex-col
      `}
    >
      {/* Header avec toggle */}
      <div className="p-4 border-b border-[#404040]">
        <button onClick={onToggle} className="text-white">
          {isOpen ? '←' : '→'}
        </button>
      </div>
      
      {/* Nouveau chat */}
      {isOpen && (
        <button className="m-4 p-3 bg-blue-600 text-white rounded-lg">
          📝 Nouveau chat
        </button>
      )}
      
      {/* Liste conversations - TODO */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Conversations list */}
      </div>
    </aside>
  );
};
```

**1.3 Créer ChatMain.tsx**
```tsx
// src/components/chat/ChatMain.tsx
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatMainProps {
  onToggleInfo: () => void;
}

export const ChatMain = ({ onToggleInfo }: ChatMainProps) => {
  return (
    <main className="flex-1 flex flex-col">
      <ChatHeader onToggleInfo={onToggleInfo} />
      <ChatMessages />
      <ChatInput />
    </main>
  );
};
```

**Tester**: Layout de base fonctionnel ✅

---

#### Jour 1 - Après-midi (4h): Messages & Input

**1.4 Créer ChatMessages.tsx**
```tsx
// src/components/chat/ChatMessages.tsx
import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';

export const ChatMessages = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = []; // TODO: Connect to store

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[800px] mx-auto space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
```

**1.5 Créer ChatMessage.tsx**
```tsx
// src/components/chat/ChatMessage.tsx
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
        {isUser ? '👤' : '🤖'}
      </div>
      
      {/* Message bubble */}
      <div className={`flex-1 max-w-[600px] ${isUser ? 'text-right' : ''}`}>
        <div className={`
          inline-block p-4 rounded-xl
          ${isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-[#2a2a2a] text-white'
          }
        `}>
          {message.content}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
```

**1.6 Créer ChatInput.tsx**
```tsx
// src/components/chat/ChatInput.tsx
import { useState } from 'react';
import { Send } from 'lucide-react';

export const ChatInput = () => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) return;
    // TODO: Send message
    setMessage('');
  };

  return (
    <div className="border-t border-[#404040] p-4">
      <div className="max-w-[800px] mx-auto flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tapez votre message..."
          className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-[#404040] rounded-xl text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
```

**Tester**: Messages affichés + Input fonctionnel ✅

---

#### Jour 2 - Matin (4h): Store & Historique

**2.1 Créer chatHistoryStore.ts**
```tsx
// src/store/chatHistoryStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatHistoryStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  
  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearCurrentConversation: () => void;
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      
      createConversation: () => {
        const id = crypto.randomUUID();
        set((state) => ({
          conversations: [
            ...state.conversations,
            {
              id,
              title: 'Nouvelle conversation',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          currentConversationId: id,
        }));
        return id;
      },
      
      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId: 
            state.currentConversationId === id 
              ? null 
              : state.currentConversationId,
        }));
      },
      
      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },
      
      addMessage: (message) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                  // Auto-generate title from first message
                  title: conv.messages.length === 0 
                    ? message.content.slice(0, 50) 
                    : conv.title,
                }
              : conv
          ),
        }));
      },
      
      clearCurrentConversation: () => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? { ...conv, messages: [] }
              : conv
          ),
        }));
      },
    }),
    {
      name: 'chat-history',
    }
  )
);
```

**2.2 Connecter Store aux Composants**
```tsx
// Mettre à jour ChatSidebar pour afficher les conversations
// Mettre à jour ChatMessages pour afficher les messages du store
// Mettre à jour ChatInput pour sauvegarder dans le store
```

**Tester**: Historique persisté + changement conversation ✅

---

#### Jour 2 - Après-midi (4h): Markdown & Code Highlighting

**2.3 Installer Dépendances**
```bash
npm install react-markdown remark-gfm rehype-highlight highlight.js
```

**2.4 Créer MessageRenderer.tsx**
```tsx
// src/components/chat/MessageRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CodeBlock } from './CodeBlock';
import 'highlight.js/styles/github-dark.css';

interface MessageRendererProps {
  content: string;
}

export const MessageRenderer = ({ content }: MessageRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({node, inline, className, children, ...props}) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock
              language={match[1]}
              code={String(children).replace(/\n$/, '')}
              {...props}
            />
          ) : (
            <code 
              className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-sm" 
              {...props}
            >
              {children}
            </code>
          );
        },
        a({children, href}) {
          return (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {children}
            </a>
          );
        },
        table({children}) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-[#404040]">
                {children}
              </table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

**2.5 Créer CodeBlock.tsx**
```tsx
// src/components/chat/CodeBlock.tsx
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-t-lg">
        <span className="text-sm text-gray-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={16} />
              Copié!
            </>
          ) : (
            <>
              <Copy size={16} />
              Copier
            </>
          )}
        </button>
      </div>
      
      {/* Code */}
      <pre className="p-4 bg-[#0a0a0a] border border-t-0 border-[#404040] rounded-b-lg overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};
```

**Tester**: Markdown rendu + code highlighted ✅

---

#### Jour 3: Polish & Tests

**3.1 Ajouter Typing Indicator**
```tsx
// src/components/chat/TypingIndicator.tsx
export const TypingIndicator = () => (
  <div className="flex gap-2 p-4">
    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
      🤖
    </div>
    <div className="flex items-center gap-1 px-4 py-3 bg-[#2a2a2a] rounded-xl">
      <div 
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
        style={{ animationDelay: '0ms' }}
      />
      <div 
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
        style={{ animationDelay: '150ms' }}
      />
      <div 
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
        style={{ animationDelay: '300ms' }}
      />
    </div>
  </div>
);
```

**3.2 Tests Finaux**
- [ ] Créer conversation
- [ ] Envoyer messages
- [ ] Markdown rendu correctement
- [ ] Code highlighted
- [ ] Historique sauvegardé
- [ ] Changement conversation
- [ ] Responsive (mobile/tablet/desktop)

**FIN PHASE 1** ✅  
**Score atteint**: 7.5/10

---

### PHASE 2: Design System Complet (Jours 4-7)
**Priorité**: ⭐⭐ MAJEUR  
**Durée**: 3-4 jours  
**Score cible**: 8.5/10

#### Jour 4: Composants UI de Base

**4.1 Avatar.tsx**
**4.2 Badge.tsx**
**4.3 Tooltip.tsx**
**4.4 Skeleton.tsx**
**4.5 Toast.tsx**

#### Jour 5-6: Migration Panels

**5.1 Identifier Patterns Communs**
**5.2 Créer Templates**
**5.3 Migrer 10 panels/jour**

#### Jour 7: Responsive & Polish

**7.1 Media Queries**
**7.2 Mobile Menu**
**7.3 Touch Gestures**

---

### PHASE 3: Features Avancées (Jours 8-10)
**Priorité**: ⭐ MINEUR  
**Durée**: 2-3 jours  
**Score cible**: 9.5/10

#### Jour 8: Animations

**8.1 Framer Motion**
**8.2 Page Transitions**
**8.3 Micro-interactions**

#### Jour 9: Artifacts

**9.1 Artifact Viewer**
**9.2 Code Preview**
**9.3 Charts**

#### Jour 10: Final Polish

**10.1 Accessibility**
**10.2 Performance**
**10.3 Tests E2E**

---

## 📦 Packages à Installer

```bash
# Phase 1
npm install react-markdown remark-gfm rehype-highlight highlight.js

# Phase 2
npm install @radix-ui/react-avatar @radix-ui/react-tooltip
npm install clsx tailwind-merge

# Phase 3
npm install framer-motion react-virtuoso
```

---

## ✅ Checklist Quotidienne

### Jour 1
- [ ] ChatLayout structure
- [ ] ChatSidebar avec toggle
- [ ] ChatMain avec header
- [ ] ChatMessages avec scroll
- [ ] ChatInput fonctionnel

### Jour 2
- [ ] Store Zustand créé
- [ ] Historique persisté (IndexedDB)
- [ ] Markdown renderer
- [ ] Code highlighting
- [ ] Copy code button

### Jour 3
- [ ] Typing indicator
- [ ] Recherche conversations
- [ ] Export/import
- [ ] Tests complets
- [ ] Documentation

---

## 🎯 KPIs de Succès

### Performance
- [x] Build time < 30s
- [ ] Hot reload < 1s
- [ ] First paint < 1s
- [ ] Time to interactive < 2s

### Qualité
- [x] TypeScript 0 errors
- [ ] ESLint 0 errors
- [ ] 90% test coverage
- [ ] 95+ accessibility score

### Fonctionnalités
- [ ] Chat fullscreen
- [ ] Historique persistant
- [ ] Markdown + code
- [ ] Responsive mobile
- [ ] Dark mode

---

## 🚨 Risques & Mitigations

### Risque 1: Performance avec beaucoup de messages
**Mitigation**: Virtual scrolling (react-virtuoso)

### Risque 2: State management complexe
**Mitigation**: Zustand avec persist middleware

### Risque 3: Code highlighting lourd
**Mitigation**: Lazy load highlight.js languages

### Risque 4: Mobile responsive compliqué
**Mitigation**: Mobile-first approach + tests

---

**Roadmap créée par Cascade AI**  
**6 Novembre 2025, 00:40**
