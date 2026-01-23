import React from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import { User, Bot } from 'lucide-react';

export interface ChatMessageProps {
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp?: number;
  avatar?: string;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  sender,
  timestamp,
  avatar,
  isStreaming
}) => {
  const isUser = sender === 'user';
  
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      mb: 2,
      gap: 1.5,
      px: 2
    }}>
      <Avatar sx={{ 
        bgcolor: isUser ? 'primary.main' : 'secondary.main',
        width: 32, 
        height: 32 
      }}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </Avatar>
      
      <Box sx={{ maxWidth: '80%' }}>
        <Paper elevation={1} sx={{
          p: 1.5,
          borderRadius: 2,
          borderTopRightRadius: isUser ? 0 : 2,
          borderTopLeftRadius: isUser ? 2 : 0,
          bgcolor: isUser ? 'primary.light' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary'
        }}>
          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
            {content}
            {isStreaming && <span className="animate-pulse">|</span>}
          </Typography>
        </Paper>
        
        {timestamp && (
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: isUser ? 'right' : 'left', color: 'text.secondary' }}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
