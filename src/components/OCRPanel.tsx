/**
 * OCRPanel - Panneau pour la reconnaissance optique de caractères
 * 
 * Ce composant fournit une interface utilisateur pour extraire du texte
 * à partir d'images, de captures d'écran ou de la webcam.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Select, MenuItem, FormControl, 
  InputLabel, CircularProgress, Paper, IconButton, Alert, Tooltip } from '@mui/material';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ScreenshotIcon from '@mui/icons-material/Screenshot';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { agentRegistry } from '../features/agents/core/registry';
import type { OCRAgent, OCRSource, OCROptions, OCRResult } from '../agents/OCRAgent';

interface OCRPanelProps {
  expanded?: boolean;
}

export const OCRPanel: React.FC<OCRPanelProps> = ({ expanded = false }) => {
  // États du composant
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [source, setSource] = useState<OCRSource>('screenshot');
  const [language, setLanguage] = useState<string>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enhanceImage, _setEnhanceImage] = useState(true);
  const [fileInput, setFileInput] = useState<File | null>(null);

  // Référence à l'agent OCR (lazy loading)
  const [ocrAgent, setOcrAgent] = useState<OCRAgent | null>(null);
  const [agentAvailable, setAgentAvailable] = useState(false);

  // Charger l'agent de manière asynchrone
  const loadOCRAgent = useCallback(async () => {
    try {
      const agent = await agentRegistry.getAgentAsync('OCRAgent');
      setOcrAgent(agent as OCRAgent | null);
      setAgentAvailable(!!agent);
    } catch (err) {
      console.error('Erreur chargement OCRAgent:', err);
      setAgentAvailable(false);
    }
  }, []);

  useEffect(() => {
    loadOCRAgent();
  }, [loadOCRAgent]);

  // Fonction pour extraire du texte
  const extractText = async () => {
    if (!agentAvailable) {
      setError('OCRAgent n\'est pas disponible');
      return;
    }

    setError(null);
    setIsProcessing(true);
    
    try {
      const options: OCROptions = {
        language,
        enhanceImage,
      };

      const result = await ocrAgent.execute({
        intent: 'extract_text',
        parameters: {
          source,
          options
        }
      });

      if (!result.success) {
        throw new Error(result.error as string);
      }

      setResult(result.output as OCRResult);
      
      // Dans une implémentation réelle, on pourrait récupérer l'image source ici
      // et la définir comme aperçu
      if (source === 'screenshot') {
        setImagePreview("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'extraction du texte');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Fonction pour copier le texte extrait dans le presse-papiers
  const copyToClipboard = () => {
    if (result && result.text) {
      navigator.clipboard.writeText(result.text)
        .then(() => {
          // Feedback visuel temporaire
          const originalText = result.text;
          setResult({...result, text: 'Copié !'});
          setTimeout(() => {
            setResult({...result, text: originalText});
          }, 1000);
        })
        .catch(err => {
          console.error('Erreur lors de la copie dans le presse-papiers:', err);
          setError('Impossible de copier dans le presse-papiers');
        });
    }
  };

  // Gestion du fichier sélectionné
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileInput(files[0]);
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // Bascule de l'état d'expansion du panneau
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Déterminer l'icône à afficher en fonction de la source
  const getSourceIcon = () => {
    switch (source) {
      case 'screenshot':
        return <ScreenshotIcon />;
      case 'webcam':
        return <PhotoCameraIcon />;
      case 'file':
        return <ImageSearchIcon />;
      default:
        return <ScreenshotIcon />;
    }
  };

  return (
    <Box sx={{ 
      border: '1px solid #e0e0e0',
      borderRadius: 1,
      mb: 2,
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* En-tête du panneau */}
      <Box 
        sx={{ 
          p: 1, 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ImageSearchIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Reconnaissance de Texte (OCR)</Typography>
        </Box>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      {/* Contenu du panneau */}
      {isExpanded && (
        <Box sx={{ p: 2 }}>
          {!agentAvailable ? (
            <Alert severity="warning">
              L'agent OCR n'est pas disponible actuellement.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={source}
                    onChange={(e) => setSource(e.target.value as OCRSource)}
                    label="Source"
                    startAdornment={getSourceIcon()}
                  >
                    <MenuItem value="screenshot">Capture d'écran</MenuItem>
                    <MenuItem value="webcam">Webcam</MenuItem>
                    <MenuItem value="file">Fichier image</MenuItem>
                    <MenuItem value="clipboard" disabled>Presse-papiers (Bientôt)</MenuItem>
                    <MenuItem value="selection" disabled>Sélection (Bientôt)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {source === 'file' && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    startIcon={<ImageSearchIcon />}
                  >
                    Sélectionner un fichier
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </Button>
                  {fileInput && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Fichier: {fileInput.name}
                    </Typography>
                  )}
                </Box>
              )}
              
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Langue</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="Langue"
                  >
                    <MenuItem value="auto">Auto-détection</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="en">Anglais</MenuItem>
                    <MenuItem value="es">Espagnol</MenuItem>
                    <MenuItem value="de">Allemand</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={extractText}
                  disabled={isProcessing || (source === 'file' && !fileInput)}
                  fullWidth
                  startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : getSourceIcon()}
                >
                  {isProcessing ? 'Extraction en cours...' : 'Extraire le texte'}
                </Button>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {imagePreview && (
                <Paper 
                  elevation={3} 
                  sx={{ 
                    mb: 2, 
                    p: 1, 
                    display: 'flex',
                    justifyContent: 'center',
                    maxHeight: '200px',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '180px',
                      objectFit: 'contain'
                    }} 
                  />
                </Paper>
              )}
              
              {result && result.text && (
                <Paper elevation={3} sx={{ p: 2, mb: 2, position: 'relative' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Texte extrait:
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {result.text}
                  </Typography>
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Tooltip title="Copier le texte">
                      <IconButton onClick={copyToClipboard}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {result.confidence !== undefined && (
                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                      Confiance: {(result.confidence * 100).toFixed(1)}%
                    </Typography>
                  )}
                </Paper>
              )}
              
              <Typography variant="body2" color="text.secondary">
                La reconnaissance optique de caractères (OCR) vous permet d'extraire du texte à partir d'images.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default OCRPanel;
