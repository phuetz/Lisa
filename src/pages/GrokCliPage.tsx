/**
 * GrokCliPage
 * Page dédiée à l'interface grok-cli dans Lisa
 */

import React from 'react';
import { Box, Container } from '@mui/material';
import { GrokCliPanel } from '../components/GrokCliPanel';

export const GrokCliPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', py: 2 }}>
      <Box
        sx={{
          height: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <GrokCliPanel />
      </Box>
    </Container>
  );
};

export default GrokCliPage;
