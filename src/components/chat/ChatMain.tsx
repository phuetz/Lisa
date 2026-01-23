/**
 * Chat Main Component
 * Zone principale du chat avec header, messages et input
 */

import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatMainProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleInfo: () => void;
}

export const ChatMain = ({ sidebarOpen, onToggleSidebar, onToggleInfo }: ChatMainProps) => {
  return (
    <main className="flex-1 flex flex-col min-w-0">
      <ChatHeader 
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        onToggleInfo={onToggleInfo} 
      />
      <ChatMessages />
      <ChatInput />
    </main>
  );
};

export default ChatMain;
