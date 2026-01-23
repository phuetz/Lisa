/**
 * ImageUpload Component
 * Upload et prévisualisation d'images pour le chat
 */

import { useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ImageUploadProps {
  onImageSelect: (base64: string) => void;
  onImageRemove: () => void;
  currentImage?: string;
  className?: string;
}

export const ImageUpload = ({ 
  onImageSelect, 
  onImageRemove, 
  currentImage,
  className 
}: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Limiter la taille à 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5MB');
      return;
    }

    // Convertir en base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {currentImage ? (
        <div className="relative inline-block">
          <img 
            src={currentImage} 
            alt="Upload" 
            className="max-w-[200px] max-h-[200px] rounded-lg border border-[#404040]"
          />
          <button
            onClick={onImageRemove}
            className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleButtonClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white',
            isDragging && 'bg-[#2a2a2a] text-white'
          )}
          title="Ajouter une image"
        >
          <ImageIcon size={20} />
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
