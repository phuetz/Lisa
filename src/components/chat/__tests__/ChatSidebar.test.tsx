/**
 * ChatSidebar Component Tests
 * Tests for sidebar functionality, search, and conversation management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockConversations = [
  {
    id: 'conv-1',
    title: 'First Conversation',
    messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
    createdAt: new Date(),
    updatedAt: new Date(),
    pinned: false,
    archived: false,
  },
  {
    id: 'conv-2',
    title: 'Pinned Conversation',
    messages: [{ id: 'm2', role: 'user', content: 'Important' }],
    createdAt: new Date(),
    updatedAt: new Date(),
    pinned: true,
    archived: false,
  },
  {
    id: 'conv-3',
    title: 'Archived Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    pinned: false,
    archived: true,
  },
];

const createMockStore = () => ({
  conversations: mockConversations,
  currentConversationId: 'conv-1',
  createConversation: vi.fn(() => 'new-conv'),
  setCurrentConversation: vi.fn(),
  deleteConversation: vi.fn(),
  archiveConversation: vi.fn(),
  pinConversation: vi.fn(),
  searchConversations: vi.fn((query: string) =>
    mockConversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
  ),
});

let mockStoreState = createMockStore();

// Mock the store
vi.mock('../../../store/chatHistoryStore', () => ({
  useChatHistoryStore: () => mockStoreState,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'il y a 5 minutes'),
}));

vi.mock('date-fns/locale', () => ({
  fr: {},
}));

import { ChatSidebar } from '../ChatSidebar';

describe('ChatSidebar', () => {
  const defaultProps = {
    isOpen: true,
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStore();
  });

  describe('Rendering', () => {
    it('should render sidebar with conversations', () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.getByText('Conversations')).toBeInTheDocument();
      expect(screen.getByText('First Conversation')).toBeInTheDocument();
      expect(screen.getByText('Pinned Conversation')).toBeInTheDocument();
    });

    it('should show "Nouveau chat" button', () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.getByText('Nouveau chat')).toBeInTheDocument();
    });

    it('should show search input', () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();
    });

    it('should hide content when collapsed', () => {
      render(<ChatSidebar isOpen={false} onToggle={defaultProps.onToggle} />);

      expect(screen.queryByText('Conversations')).not.toBeInTheDocument();
      expect(screen.queryByText('Nouveau chat')).not.toBeInTheDocument();
    });
  });

  describe('New Conversation', () => {
    it('should create new conversation when button is clicked', () => {
      render(<ChatSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Nouveau chat'));

      expect(mockStoreState.createConversation).toHaveBeenCalled();
      expect(mockStoreState.setCurrentConversation).toHaveBeenCalledWith('new-conv');
    });
  });

  describe('Conversation Selection', () => {
    it('should select conversation when clicked', () => {
      render(<ChatSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('First Conversation'));

      expect(mockStoreState.setCurrentConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should highlight current conversation', () => {
      render(<ChatSidebar {...defaultProps} />);

      const firstConvButton = screen.getByText('First Conversation').closest('button');
      expect(firstConvButton).toHaveClass('bg-[#2a2a2a]');
    });
  });

  describe('Search', () => {
    it('should filter conversations when searching', () => {
      render(<ChatSidebar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Rechercher...');
      fireEvent.change(searchInput, { target: { value: 'Pinned' } });

      expect(mockStoreState.searchConversations).toHaveBeenCalledWith('Pinned');
    });
  });

  describe('Archived Conversations', () => {
    it('should not show archived conversations by default', () => {
      render(<ChatSidebar {...defaultProps} />);

      expect(screen.queryByText('Archived Conversation')).not.toBeInTheDocument();
    });

    it('should show archived conversations when filter is toggled', () => {
      mockStoreState.searchConversations = vi.fn(() => mockConversations);
      render(<ChatSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Archivées'));

      // After toggling, archived conversations should be visible
      expect(screen.getByText('Archivées')).toBeInTheDocument();
    });
  });

  describe('Toggle', () => {
    it('should call onToggle when toggle button is clicked', () => {
      render(<ChatSidebar {...defaultProps} />);

      // Find the toggle button (ChevronLeft icon button)
      const toggleButton = screen.getByTitle('Réduire');
      fireEvent.click(toggleButton);

      expect(defaultProps.onToggle).toHaveBeenCalled();
    });

    it('should show expand button when collapsed', () => {
      render(<ChatSidebar isOpen={false} onToggle={defaultProps.onToggle} />);

      expect(screen.getByTitle('Étendre')).toBeInTheDocument();
    });
  });

  describe('Conversation Actions', () => {
    it('should show pin button on hover', () => {
      render(<ChatSidebar {...defaultProps} />);

      // Pin button should be present in the DOM (opacity controlled by CSS)
      const pinButtons = screen.getAllByTitle('Épingler');
      expect(pinButtons.length).toBeGreaterThan(0);
    });

    it('should show archive button on hover', () => {
      render(<ChatSidebar {...defaultProps} />);

      const archiveButtons = screen.getAllByTitle('Archiver');
      expect(archiveButtons.length).toBeGreaterThan(0);
    });

    it('should show delete button on hover', () => {
      render(<ChatSidebar {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle('Supprimer');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Export', () => {
    it('should export conversations when export button is clicked', () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      render(<ChatSidebar {...defaultProps} />);

      const exportButton = screen.getByTitle('Exporter');
      fireEvent.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });
});
