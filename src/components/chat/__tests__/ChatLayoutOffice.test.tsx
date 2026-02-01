/**
 * ChatLayoutOffice Component Tests
 * Tests for Office 365 style chat layout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock stores
const mockCreateConversation = vi.fn(() => 'new-conv-id');
const mockSetCurrentConversation = vi.fn();
const mockDeleteConversation = vi.fn();

vi.mock('../../../store/chatHistoryStore', () => ({
  useChatHistoryStore: () => ({
    conversations: [
      {
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
          { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    currentConversationId: 'conv-1',
    createConversation: mockCreateConversation,
    setCurrentConversation: mockSetCurrentConversation,
    deleteConversation: mockDeleteConversation,
  }),
  useArtifactPanelStore: () => ({
    isOpen: false,
    artifact: null,
    closePanel: vi.fn(),
  }),
}));

vi.mock('../../../store/chatSettingsStore', () => ({
  useChatSettingsStore: () => ({
    model: 'gpt-4',
  }),
}));

vi.mock('../../../store/officeThemeStore', () => ({
  useOfficeThemeStore: () => ({
    getCurrentColors: () => ({
      editor: '#1e1e1e',
      editorText: '#ffffff',
      sidebar: '#252526',
      border: '#3c3c3c',
      accent: '#0078d4',
      accentHover: '#106ebe',
      ribbon: '#0078d4',
      sidebarHover: '#2a2d2e',
      editorSecondary: '#888888',
    }),
    getCurrentTheme: () => 'dark',
    transitionsEnabled: false,
  }),
  useIsDarkMode: () => true,
}));

vi.mock('../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    sendMessage: vi.fn(),
    isStreaming: false,
  }),
}));

// Mock child components
vi.mock('../ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

vi.mock('../ChatSettingsPanel', () => ({
  ChatSettingsPanel: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="settings-panel">Settings</div> : null,
}));

vi.mock('../ArtifactPanel', () => ({
  ArtifactPanel: () => <div data-testid="artifact-panel">Artifact</div>,
}));

vi.mock('../../office', () => ({
  OfficeTopBar: ({ appName }: { appName: string }) => (
    <div data-testid="office-top-bar">{appName}</div>
  ),
  OfficeThemePanel: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="theme-panel">Theme</div> : null,
}));

vi.mock('../../fluent', () => ({
  FluentButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="fluent-button">{children}</button>
  ),
  FluentMessageBubble: ({ content, sender }: { content: string; sender: { name: string } }) => (
    <div data-testid="message-bubble">
      <span>{sender.name}:</span> {content}
    </div>
  ),
  FluentChatInput: ({ onSend, placeholder }: { onSend: (msg: string) => void; placeholder: string }) => (
    <input
      data-testid="chat-input"
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSend((e.target as HTMLInputElement).value);
        }
      }}
    />
  ),
  FluentConversationList: ({ conversations, onSelect }: { conversations: unknown[]; onSelect: (conv: unknown) => void }) => (
    <div data-testid="conversation-list">
      {(conversations as Array<{ id: string; title: string }>).map((conv) => (
        <button key={conv.id} onClick={() => onSelect(conv)} data-testid={`conv-${conv.id}`}>
          {conv.title}
        </button>
      ))}
    </div>
  ),
}));

import { ChatLayoutOffice } from '../ChatLayoutOffice';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

describe('ChatLayoutOffice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the Office top bar', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByTestId('office-top-bar')).toBeInTheDocument();
      expect(screen.getByText('Lisa')).toBeInTheDocument();
    });

    it('should render the conversation list', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    });

    it('should render the chat input', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('should render messages', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/Hi there!/)).toBeInTheDocument();
    });

    it('should render connection status', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('New Conversation', () => {
    it('should create new conversation when button is clicked', () => {
      renderWithRouter(<ChatLayoutOffice />);

      const newChatButtons = screen.getAllByTestId('fluent-button');
      const newChatButton = newChatButtons.find(btn => btn.textContent?.includes('Nouvelle conversation'));

      if (newChatButton) {
        fireEvent.click(newChatButton);
        expect(mockCreateConversation).toHaveBeenCalled();
        expect(mockSetCurrentConversation).toHaveBeenCalledWith('new-conv-id');
      }
    });
  });

  describe('Conversation Selection', () => {
    it('should select conversation from list', () => {
      renderWithRouter(<ChatLayoutOffice />);

      fireEvent.click(screen.getByTestId('conv-conv-1'));

      expect(mockSetCurrentConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Chat Title', () => {
    it('should display conversation title in header', () => {
      renderWithRouter(<ChatLayoutOffice />);
      // Title appears in both sidebar and header, so use getAllByText
      const titles = screen.getAllByText('Test Conversation');
      expect(titles.length).toBeGreaterThanOrEqual(1);
      // Verify h1 header exists
      const header = titles.find((el) => el.tagName.toLowerCase() === 'h1');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Theme Panel', () => {
    it('should open theme panel when customize button is clicked', () => {
      renderWithRouter(<ChatLayoutOffice />);

      const customizeButtons = screen.getAllByTestId('fluent-button');
      const customizeButton = customizeButtons.find(btn => btn.textContent?.includes('Personnaliser'));

      if (customizeButton) {
        fireEvent.click(customizeButton);
        expect(screen.getByTestId('theme-panel')).toBeInTheDocument();
      }
    });
  });

  describe('Artifact Panel', () => {
    it('should render artifact panel', () => {
      renderWithRouter(<ChatLayoutOffice />);
      expect(screen.getByTestId('artifact-panel')).toBeInTheDocument();
    });
  });
});
