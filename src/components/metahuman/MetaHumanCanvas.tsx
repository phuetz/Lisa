import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { Html } from '@react-three/drei';
import { ModelLoader } from '../ModelLoader';
import { useMetaHumanStore } from '../../store/metaHumanStore';

function Scene() {
  const { expression, expressionIntensity, pose, speechText, isSpeaking } = useMetaHumanStore();

  // Log the state for now
  console.log('MetaHuman State:', { expression, expressionIntensity, pose, speechText, isSpeaking });

  return (
    <>
      {/* Éclairage pour un personnage */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, 5, -5]} intensity={0.7} />
      <pointLight position={[0, 2, 0]} intensity={0.3} />

      {/* Placeholder pour le modèle MetaHuman */}
      {/* Ici, un modèle GLTF serait chargé, par exemple avec useGLTF */}
      <ModelLoader />

      <OrbitControls />
    </>
  );
}

export function MetaHumanCanvas() {
  return (
    <Canvas style={{ position: 'fixed', top: 0, left: 0, zIndex: -1 }}>
      <Suspense fallback={<Html center>Loading MetaHuman...</Html>}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
