/**
 * ChatMessages Component Tests
 * Tests for message display, actions, and empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Create a mock store state
const createMockStore = (overrides = {}) => ({
  getCurrentConversation: vi.fn(() => null),
  currentConversationId: 'conv-1',
  streamingMessage: null,
  isTyping: false,
  updateMessage: vi.fn(),
  deleteMessage: vi.fn(),
  addMessage: vi.fn(),
  setTyping: vi.fn(),
  setStreamingMessage: vi.fn(),
  ...overrides,
});

let mockStoreState = createMockStore();

// Mock the stores
vi.mock('../../../store/chatHistoryStore', () => ({
  useChatHistoryStore: () => mockStoreState,
  useArtifactPanelStore: () => ({
    openArtifact: vi.fn(),
  }),
}));

// Mock MarkdownRenderer
vi.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

// Mock artifactParser
vi.mock('../../../utils/artifactParser', () => ({
  parseArtifacts: (content: string) => ({ text: content, artifacts: [] }),
}));

import { ChatMessages } from '../ChatMessages';

describe('ChatMessages', () => {
  const mockMessages = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello Lisa!',
      createdAt: new Date(),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      createdAt: new Date(),
      metadata: { model: 'gpt-4', duration: 500 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStore();
  });

  describe('Empty State', () => {
    it('should show welcome screen when no messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: [] }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Bonjour ! Je suis Lisa')).toBeInTheDocument();
      expect(screen.getByText(/Votre assistante IA/)).toBeInTheDocument();
    });

    it('should show welcome screen when no conversation', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => null,
        currentConversationId: null,
      });

      render(<ChatMessages />);

      expect(screen.getByText('Bonjour ! Je suis Lisa')).toBeInTheDocument();
    });

    it('should display prompt suggestions', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: [] }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Aide-moi à écrire du code Python')).toBeInTheDocument();
      expect(screen.getByText('Résume ce document pour moi')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should render user and assistant messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Hello Lisa!')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
    });

    it('should display "Vous" for user messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Vous')).toBeInTheDocument();
    });

    it('should display "Lisa" for assistant messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getAllByText('Lisa').length).toBeGreaterThan(0);
    });

    it('should show metadata for assistant messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('gpt-4')).toBeInTheDocument();
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });
  });

  describe('Streaming Message', () => {
    it('should display streaming message with cursor', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
        streamingMessage: 'I am thinking about your question...',
      });

      render(<ChatMessages />);

      expect(screen.getByText('I am thinking about your question...')).toBeInTheDocument();
    });
  });

  describe('Typing Indicator', () => {
    it('should show thinking indicator when typing', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
        isTyping: true,
        streamingMessage: null,
      });

      render(<ChatMessages />);

      expect(screen.getByText('réfléchit...')).toBeInTheDocument();
    });
  });

  describe('Message Actions', () => {
    it('should show copy button for messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      const copyButtons = screen.getAllByText('Copier');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should show edit button for user messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });

    it('should show regenerate button for assistant messages', () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });

      render(<ChatMessages />);

      expect(screen.getByText('Régénérer')).toBeInTheDocument();
    });

    it('should copy content to clipboard when copy is clicked', async () => {
      mockStoreState = createMockStore({
        getCurrentConversation: () => ({ messages: mockMessages }),
      });
      const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<ChatMessages />);

      const copyButtons = screen.getAllByText('Copier');
      fireEvent.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
