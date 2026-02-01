import React, { useCallback, useState } from 'react';
import { Box, Typography, Button, Slider, ButtonGroup } from '@mui/material';
import { useMetaHumanStore } from '../store/metaHumanStore';

export function MetaHumanControlsPanel() {
  const { setBlendShapeWeight, setPose, setSpeech } = useMetaHumanStore();
  const [currentExpression, setCurrentExpression] = useState<string>('neutral');
  const [expressionIntensity, setLocalExpressionIntensity] = useState<number>(0.5);

  const handleExpressionChange = useCallback((event: Event, newValue: number | number[]) => {
    const intensity = newValue as number;
    setLocalExpressionIntensity(intensity);
    setBlendShapeWeight(currentExpression, intensity);
  }, [currentExpression, setBlendShapeWeight]);

  const handleSetExpression = useCallback((expression: string) => {
    setCurrentExpression(expression);
    // Reset all blend shapes and set the new one
    useMetaHumanStore.getState().setExpression(expression, expressionIntensity);
  }, [expressionIntensity]);

  const handleSetPose = useCallback((pose: string) => {
    setPose(pose);
  }, [setPose]);

  const handleSpeechAnimation = useCallback(() => {
    const text = 'Hello, how are you?';
    const duration = text.length * 0.08; // Estimate duration
    setSpeech(text, true);
    setTimeout(() => setSpeech(text, false), duration * 1000);
  }, [setSpeech]);

  return (
    <Box sx={{
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 3,
      mb: 2,
      width: '100%'
    }}>
      <Typography variant="h6" gutterBottom>MetaHuman Controls</Typography>
      
      <Typography gutterBottom>Expression: {currentExpression}</Typography>
      <ButtonGroup variant="contained" fullWidth aria-label="expression buttons">
        <Button onClick={() => handleSetExpression('neutral')}>Neutral</Button>
        <Button onClick={() => handleSetExpression('happy')}>Happy</Button>
        <Button onClick={() => handleSetExpression('sad')}>Sad</Button>
        <Button onClick={() => handleSetExpression('angry')}>Angry</Button>
        <Button onClick={() => handleSetExpression('surprise')}>Surprise</Button>
      </ButtonGroup>

      <Typography gutterBottom sx={{ mt: 2 }}>Expression Intensity</Typography>
      <Slider
        value={expressionIntensity}
        step={0.1}
        marks
        min={0}
        max={1}
        onChange={handleExpressionChange}
        valueLabelDisplay="auto"
      />

      <Typography gutterBottom sx={{ mt: 2 }}>Pose</Typography>
      <ButtonGroup variant="contained" fullWidth aria-label="pose buttons">
        <Button onClick={() => handleSetPose('default')}>Default</Button>
        <Button onClick={() => handleSetPose('sitting')}>Sitting</Button>
        <Button onClick={() => handleSetPose('standing')}>Standing</Button>
        <Button onClick={() => handleSetPose('thinking')}>Thinking</Button>
      </ButtonGroup>

      <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleSpeechAnimation}>
        Animate Speech
      </Button>
    </Box>
  );
}
