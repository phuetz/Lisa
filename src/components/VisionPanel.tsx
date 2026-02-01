/**
 * VisionPanel - Panneau pour la vision par ordinateur
 * 
 * Ce composant fournit une interface utilisateur pour utiliser les capacités
 * de vision par ordinateur, permettant d'analyser des images et de décrire
 * ce qui est visible via la webcam ou des captures d'écran.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, Select, MenuItem, FormControl, 
  InputLabel, CircularProgress, Paper, Chip, Grid, Alert } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ScreenshotIcon from '@mui/icons-material/Screenshot';
import CategoryIcon from '@mui/icons-material/Category';
import FaceIcon from '@mui/icons-material/Face';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { agentRegistry } from '../agents/registry';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import { VisionAgent } from '../agents/VisionAgent';
import type { VisionSource, VisionTask, VisionResult } from '../agents/VisionAgent';

interface VisionPanelProps {
  expanded?: boolean;
}

export const VisionPanel: React.FC<VisionPanelProps> = ({ expanded = false }) => {
  // Media permissions hook
  const { permissions, requestCamera } = useMediaPermissions();
  // États du composant
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [source, setSource] = useState<VisionSource>('webcam');
  const [task, setTask] = useState<VisionTask>('general_description');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  // Référence à l'élément vidéo pour la webcam
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Référence au stream de la webcam
  const streamRef = useRef<MediaStream | null>(null);

  // Référence à l'agent Vision
  const visionAgent = agentRegistry.getAgent('VisionAgent') as VisionAgent;

  // Vérification de la disponibilité de l'agent
  const agentAvailable = !!visionAgent;

  // Initialiser ou arrêter la webcam en fonction de l'état du panneau et de la source
  useEffect(() => {
    if (isExpanded && source === 'webcam') {
      initWebcam();
    } else {
      stopWebcam();
    }

    // Nettoyage au démontage du composant
    return () => {
      stopWebcam();
    };
  }, [isExpanded, source]);

  // Fonction pour initialiser la webcam
  const initWebcam = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La fonctionnalité de webcam n\'est pas disponible dans ce navigateur');
      }

      const stream = await requestCamera({ video: true });
      if (!stream) {
        throw new Error('Permission caméra refusée');
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setWebcamActive(true);
      }
    } catch (err: any) {
      console.error('Erreur d\'accès à la webcam:', err);
      setError(err.message || 'Impossible d\'accéder à la webcam');
      setWebcamActive(false);
    }
  };

  // Fonction pour arrêter la webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setWebcamActive(false);
    }
  };

  // Fonction pour analyser l'image
  const analyzeImage = async () => {
    if (!agentAvailable) {
      setError('VisionAgent n\'est pas disponible');
      return;
    }

    setError(null);
    setIsProcessing(true);
    
    try {
      // Capture d'image depuis la webcam si nécessaire
      if (source === 'webcam' && !webcamActive) {
        await initWebcam();
      }

      const result = await visionAgent.execute({
        intent: 'analyze_image',
        parameters: {
          source,
          task,
          options: {
            confidenceThreshold: 0.7,
            maxResults: 10
          }
        }
      });

      if (!result.success) {
        throw new Error(result.error as string);
      }

      setResult(result.output as VisionResult);
      
      // Dans une implémentation réelle, on pourrait capturer l'image et la définir comme aperçu
      setImagePreview("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'analyse de l\'image');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bascule de l'état d'expansion du panneau
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Déterminer l'icône à afficher en fonction de la tâche
  const getTaskIcon = () => {
    switch (task) {
      case 'general_description':
        return <VisibilityIcon />;
      case 'object_detection':
        return <CategoryIcon />;
      case 'face_detection':
        return <FaceIcon />;
      case 'color_analysis':
        return <ColorLensIcon />;
      default:
        return <VisibilityIcon />;
    }
  };

  // Rendu du résultat en fonction de la tâche
  const renderTaskResult = () => {
    if (!result) return null;

    switch (task) {
      case 'general_description':
        return (
          <>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {result.description || "Aucune description disponible."}
            </Typography>
            {result.sceneCategories && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Catégories détectées:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {result.sceneCategories.map((category, index) => (
                    <Chip 
                      key={index}
                      label={`${category.category} (${(category.confidence * 100).toFixed(0)}%)`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        );

      case 'object_detection':
        return (
          <>
            {result.objects && result.objects.length > 0 ? (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Objets détectés: {result.objects.length}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {result.objects.map((obj, index) => (
                    <Box key={index} sx={{ width: { xs: 'calc(50% - 4px)', sm: 'calc(33.33% - 4px)' } }}>
                      <Paper 
                        elevation={2} 
                        sx={{ 
                          p: 1, 
                          textAlign: 'center',
                          bgcolor: (theme) => theme.palette.grey[50]
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {obj.name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {(obj.confidence * 100).toFixed(0)}% de confiance
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Typography variant="body1">Aucun objet détecté.</Typography>
            )}
          </>
        );

      case 'face_detection':
        return (
          <>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {result.faceCount !== undefined ? 
                `${result.faceCount} ${result.faceCount > 1 ? 'visages détectés' : 'visage détecté'}.` : 
                "Aucun visage détecté."
              }
            </Typography>
            {result.objects && result.objects.filter(obj => obj.name === 'face').map((face, index) => (
              <Paper key={index} elevation={2} sx={{ p: 1, mb: 1 }}>
                <Typography variant="subtitle2">
                  Visage {index + 1} ({(face.confidence * 100).toFixed(0)}%)
                </Typography>
                {face.attributes && (
                  <Box sx={{ mt: 1 }}>
                    {Object.entries(face.attributes).map(([key, value], i) => (
                      <Typography key={i} variant="caption" display="block">
                        {key}: {value}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            ))}
          </>
        );

      case 'color_analysis':
        return (
          <>
            {result.dominantColors && result.dominantColors.length > 0 ? (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Couleurs dominantes:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {result.dominantColors.map((color, index) => (
                    <Box key={index} sx={{ width: { xs: 'calc(25% - 4px)', sm: 'calc(16.66% - 4px)' } }}>
                      <Box 
                        sx={{ 
                          height: 40, 
                          bgcolor: color.color,
                          borderRadius: 1,
                          boxShadow: 1,
                          mb: 0.5
                        }} 
                      />
                      <Typography variant="caption" display="block" sx={{ textAlign: 'center' }}>
                        {(color.percentage * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Typography variant="body1">Aucune analyse de couleur disponible.</Typography>
            )}
          </>
        );

      default:
        return <Typography>Aucun résultat disponible.</Typography>;
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
          <VisibilityIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Vision par Ordinateur</Typography>
        </Box>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      {/* Contenu du panneau */}
      {isExpanded && (
        <Box sx={{ p: 2 }}>
          {!agentAvailable ? (
            <Alert severity="warning">
              L'agent de vision n'est pas disponible actuellement.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={source}
                    onChange={(e) => setSource(e.target.value as VisionSource)}
                    label="Source"
                    startAdornment={source === 'webcam' ? <PhotoCameraIcon sx={{ mr: 1 }} /> : <ScreenshotIcon sx={{ mr: 1 }} />}
                  >
                    <MenuItem value="webcam">Webcam</MenuItem>
                    <MenuItem value="screenshot">Capture d'écran</MenuItem>
                    <MenuItem value="file" disabled>Fichier image (Bientôt)</MenuItem>
                    <MenuItem value="url" disabled>URL d'image (Bientôt)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Type d'analyse</InputLabel>
                  <Select
                    value={task}
                    onChange={(e) => setTask(e.target.value as VisionTask)}
                    label="Type d'analyse"
                    startAdornment={getTaskIcon()}
                  >
                    <MenuItem value="general_description">Description générale</MenuItem>
                    <MenuItem value="object_detection">Détection d'objets</MenuItem>
                    <MenuItem value="face_detection">Détection de visages</MenuItem>
                    <MenuItem value="color_analysis">Analyse des couleurs</MenuItem>
                    <MenuItem value="landmark_detection" disabled>Détection de points d'intérêt (Bientôt)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Prévisualisation de la webcam */}
              {source === 'webcam' && (
                <Paper 
                  elevation={3} 
                  sx={{ 
                    mb: 2, 
                    p: 1, 
                    display: 'flex',
                    justifyContent: 'center',
                    height: webcamActive ? '200px' : 'auto'
                  }}
                >
                  {webcamActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        maxWidth: '100%',
                        maxHeight: '180px',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100px' 
                    }}>
                      <PhotoCameraIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Webcam non active
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
              
              {/* Aperçu d'image (pour les captures d'écran ou les résultats) */}
              {source !== 'webcam' && imagePreview && (
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
              
              <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
                <Button 
                  variant="contained" 
                  onClick={analyzeImage}
                  disabled={isProcessing}
                  fullWidth
                  startIcon={isProcessing ? 
                    <CircularProgress size={20} color="inherit" /> : 
                    getTaskIcon()
                  }
                >
                  {isProcessing ? 'Analyse en cours...' : 'Analyser l\'image'}
                </Button>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {/* Résultats */}
              {result && (
                <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Résultats:
                  </Typography>
                  {renderTaskResult()}
                  
                  {result.processingTimeMs !== undefined && (
                    <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                      Temps de traitement: {result.processingTimeMs} ms
                    </Typography>
                  )}
                </Paper>
              )}
              
              <Typography variant="body2" color="text.secondary">
                La vision par ordinateur permet à Lisa d'analyser et de comprendre le contenu visuel.
                Utilisez différentes analyses pour obtenir des informations sur ce qui est visible.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default VisionPanel;
