/**
 * ImageEditor Component
 * Permet d'annoter et modifier des images avant envoi
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Pencil,
  Type,
  Square,
  Circle,
  ArrowRight,
  Undo,
  Redo,
  Trash2,
  Download,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageBase64: string) => void;
  onCancel: () => void;
}

type Tool = 'pencil' | 'text' | 'rectangle' | 'circle' | 'arrow';

interface DrawAction {
  type: Tool;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  lineWidth: number;
}

export const ImageEditor = ({ imageUrl, onSave, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [undoneActions, setUndoneActions] = useState<DrawAction[]>([]);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Set canvas size
    canvas.width = image.width;
    canvas.height = image.height;

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    ctx.drawImage(image, 0, 0);

    ctx.restore();

    // Draw all actions
    actions.forEach(action => drawAction(ctx, action));

    // Draw current action
    if (currentAction) {
      drawAction(ctx, currentAction);
    }
  }, [image, actions, currentAction, zoom, rotation]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (action.type) {
      case 'pencil':
        if (action.points && action.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          action.points.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.stroke();
        }
        break;

      case 'rectangle':
        if (action.startX !== undefined && action.startY !== undefined &&
            action.endX !== undefined && action.endY !== undefined) {
          ctx.strokeRect(
            action.startX,
            action.startY,
            action.endX - action.startX,
            action.endY - action.startY
          );
        }
        break;

      case 'circle':
        if (action.startX !== undefined && action.startY !== undefined &&
            action.endX !== undefined && action.endY !== undefined) {
          const radiusX = Math.abs(action.endX - action.startX) / 2;
          const radiusY = Math.abs(action.endY - action.startY) / 2;
          const centerX = action.startX + (action.endX - action.startX) / 2;
          const centerY = action.startY + (action.endY - action.startY) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'arrow':
        if (action.startX !== undefined && action.startY !== undefined &&
            action.endX !== undefined && action.endY !== undefined) {
          const headLength = 15;
          const angle = Math.atan2(action.endY - action.startY, action.endX - action.startX);

          ctx.beginPath();
          ctx.moveTo(action.startX, action.startY);
          ctx.lineTo(action.endX, action.endY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(action.endX, action.endY);
          ctx.lineTo(
            action.endX - headLength * Math.cos(angle - Math.PI / 6),
            action.endY - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(action.endX, action.endY);
          ctx.lineTo(
            action.endX - headLength * Math.cos(angle + Math.PI / 6),
            action.endY - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        if (action.startX !== undefined && action.startY !== undefined && action.text) {
          ctx.font = `${action.lineWidth * 6}px Arial`;
          ctx.fillText(action.text, action.startX, action.startY);
        }
        break;
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);

    if (tool === 'text') {
      setTextPosition(pos);
      return;
    }

    const newAction: DrawAction = {
      type: tool,
      color,
      lineWidth,
      startX: pos.x,
      startY: pos.y,
      endX: pos.x,
      endY: pos.y,
      points: tool === 'pencil' ? [pos] : undefined,
    };

    setCurrentAction(newAction);
    setUndoneActions([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction) return;

    const pos = getMousePos(e);

    if (tool === 'pencil') {
      setCurrentAction(prev => ({
        ...prev!,
        points: [...(prev?.points || []), pos],
      }));
    } else {
      setCurrentAction(prev => ({
        ...prev!,
        endX: pos.x,
        endY: pos.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (currentAction) {
      setActions(prev => [...prev, currentAction]);
      setCurrentAction(null);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textPosition && textInput.trim()) {
      const textAction: DrawAction = {
        type: 'text',
        color,
        lineWidth,
        startX: textPosition.x,
        startY: textPosition.y,
        text: textInput,
      };
      setActions(prev => [...prev, textAction]);
      setTextInput('');
      setTextPosition(null);
    }
  };

  const handleUndo = () => {
    if (actions.length > 0) {
      const lastAction = actions[actions.length - 1];
      setActions(prev => prev.slice(0, -1));
      setUndoneActions(prev => [...prev, lastAction]);
    }
  };

  const handleRedo = () => {
    if (undoneActions.length > 0) {
      const lastUndone = undoneActions[undoneActions.length - 1];
      setUndoneActions(prev => prev.slice(0, -1));
      setActions(prev => [...prev, lastUndone]);
    }
  };

  const handleClear = () => {
    setActions([]);
    setUndoneActions([]);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'image-edited.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pencil', icon: <Pencil size={18} />, label: 'Crayon' },
    { id: 'text', icon: <Type size={18} />, label: 'Texte' },
    { id: 'rectangle', icon: <Square size={18} />, label: 'Rectangle' },
    { id: 'circle', icon: <Circle size={18} />, label: 'Cercle' },
    { id: 'arrow', icon: <ArrowRight size={18} />, label: 'Flèche' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 2000,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333',
      }}>
        <button
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#333',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
          Annuler
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '8px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Télécharger"
          >
            <Download size={18} />
          </button>
          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#10a37f',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Check size={18} />
            Envoyer
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '12px',
        backgroundColor: '#252525',
        flexWrap: 'wrap',
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                padding: '10px',
                backgroundColor: tool === t.id ? '#10a37f' : '#333',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
              }}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#444' }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: c,
                border: color === c ? '3px solid #fff' : '1px solid #444',
                borderRadius: '50%',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#444' }} />

        {/* Line width */}
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => setLineWidth(parseInt(e.target.value))}
          style={{ width: '80px' }}
        />

        <div style={{ width: '1px', height: '24px', backgroundColor: '#444' }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleUndo}
            disabled={actions.length === 0}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: actions.length === 0 ? '#555' : '#fff',
              cursor: actions.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Annuler"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={undoneActions.length === 0}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: undoneActions.length === 0 ? '#555' : '#fff',
              cursor: undoneActions.length === 0 ? 'not-allowed' : 'pointer',
            }}
            title="Refaire"
          >
            <Redo size={18} />
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#ef4444',
              cursor: 'pointer',
            }}
            title="Effacer tout"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={handleRotate}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Rotation"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Zoom +"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
            style={{
              padding: '10px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
            title="Zoom -"
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '20px',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            cursor: tool === 'text' ? 'text' : 'crosshair',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* Text input modal */}
      {textPosition && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1a1a1a',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #333',
          zIndex: 2001,
        }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Entrez votre texte..."
            autoFocus
            style={{
              width: '300px',
              padding: '12px',
              backgroundColor: '#252525',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setTextPosition(null);
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setTextPosition(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleTextSubmit}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10a37f',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
