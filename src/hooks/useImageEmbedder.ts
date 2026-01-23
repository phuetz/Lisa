import { useCallback, useState } from 'react';
import type { ImageEmbedder } from '@mediapipe/tasks-vision';

export function useImageEmbedder(imageEmbedder: ImageEmbedder | null) {
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const embedImage = useCallback(
    async (imageElement: HTMLImageElement | HTMLVideoElement) => {
      if (!imageEmbedder) return null;

      setIsProcessing(true);
      try {
        const result = imageEmbedder.embed(imageElement);
        if (result.embeddings && result.embeddings.length > 0) {
          const embeddingData = Array.from(result.embeddings[0].floatEmbedding || []);
          setEmbedding(embeddingData);
          return embeddingData;
        }
      } catch (err) {
        console.error('Image embedding error:', err);
      } finally {
        setIsProcessing(false);
      }
      return null;
    },
    [imageEmbedder]
  );

  const compareEmbeddings = useCallback(
    (embedding1: number[], embedding2: number[]): number => {
      if (embedding1.length !== embedding2.length) return 0;
      
      // Compute cosine similarity
      let dotProduct = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        magnitude1 += embedding1[i] * embedding1[i];
        magnitude2 += embedding2[i] * embedding2[i];
      }

      const similarity = dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
      return similarity;
    },
    []
  );

  return { embedding, embedImage, compareEmbeddings, isProcessing };
}
