import React from 'react';
import { Box, IconButton } from '@mui/material';
import { Mic, MicOff } from 'lucide-react';

export interface MicIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number; // 0 to 1
  onClick?: () => void;
  size?: number;
}

export const MicIndicator: React.FC<MicIndicatorProps> = ({
  isListening,
  isSpeaking,
  volume,
  onClick,
  size = 48
}) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Wave animation around the button */}
      {isListening && (
        <Box sx={{
          position: 'absolute',
          width: size + volume * 40,
          height: size + volume * 40,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: 'error.main',
          opacity: 0.5,
          transition: 'all 0.1s ease-out'
        }} />
      )}
      
      <IconButton
        onClick={onClick}
        sx={{
          width: size,
          height: size,
          bgcolor: isListening ? 'error.main' : isSpeaking ? 'primary.main' : 'grey.800',
          color: 'white',
          '&:hover': {
            bgcolor: isListening ? 'error.dark' : 'grey.700'
          }
        }}
      >
        {isListening ? <Mic size={size * 0.5} /> : <MicOff size={size * 0.5} />}
      </IconButton>
    </Box>
  );
};
