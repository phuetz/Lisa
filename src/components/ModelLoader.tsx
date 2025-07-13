import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { AnimationMixer, Clock, AnimationAction, Color, Mesh, MeshStandardMaterial } from 'three';
import { useMetaHumanStore } from '../store/metaHumanStore';

export function ModelLoader() {
  const group = useRef();
  const { scene, animations } = useGLTF('/triangle.gltf'); // Still using triangle.gltf for now
  const { expression, expressionIntensity, pose, isSpeaking } = useMetaHumanStore();

  const mixer = useRef<AnimationMixer | null>(null);
  const actions = useRef<Map<string, AnimationAction>>(new Map());
  const activeAction = useRef<AnimationAction | null>(null);

  // Initialize mixer and actions once
  useEffect(() => {
    if (scene && animations.length > 0) {
      mixer.current = new AnimationMixer(scene);
      animations.forEach(clip => {
        actions.current.set(clip.name, mixer.current!.clipAction(clip));
      });

      // Set a default idle animation if available, or the first one
      const idleAction = actions.current.get('idle') || actions.current.values().next().value;
      if (idleAction) {
        idleAction.play();
        activeAction.current = idleAction;
      }

      const clock = new Clock();
      const animate = () => {
        if (mixer.current) {
          mixer.current.update(clock.getDelta());
        }
        requestAnimationFrame(animate);
      };
      animate();

      return () => {
        if (mixer.current) {
          mixer.current.stopAllAction();
        }
      };
    }
  }, [scene, animations]);

  // Effect for playing skeletal animations (poses and speaking)
  useEffect(() => {
    if (!mixer.current || animations.length === 0) return;

    let targetAnimationName: string | null = null;

    // Prioritize speaking animation
    if (isSpeaking) {
      targetAnimationName = 'speaking'; // Expect a 'speaking' animation clip
    } else if (pose !== 'default') {
      targetAnimationName = pose; // Expect animation clips named 'sitting', 'standing' etc.
    } else {
      targetAnimationName = 'idle'; // Expect an 'idle' animation clip
    }

    const targetAction = actions.current.get(targetAnimationName!) || actions.current.values().next().value;

    if (targetAction && targetAction !== activeAction.current) {
      if (activeAction.current) {
        activeAction.current.fadeOut(0.2); // Cross-fade duration
      }
      targetAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(0.2) // Cross-fade duration
        .play();
      activeAction.current = targetAction;
    } else if (!targetAction && activeAction.current) {
      // If no specific animation found and there's an active one, stop it
      activeAction.current.fadeOut(0.2);
      activeAction.current = null;
    }
  }, [pose, isSpeaking, animations]); // Removed expression from dependencies as it's handled by blend shapes

  // Effect for controlling blend shapes (facial expressions)
  useEffect(() => {
    if (!scene) return;

    // In a real MetaHuman, you would traverse the scene to find the face mesh
    // that has morphTargetInfluences. For triangle.gltf, we'll use the main mesh.
    scene.traverse((object) => {
      if (object instanceof Mesh && object.isMesh && object.morphTargetDictionary && object.morphTargetInfluences) {
        // Reset all blend shapes first (important for smooth transitions)
        for (const key in object.morphTargetDictionary) {
          object.morphTargetInfluences[object.morphTargetDictionary[key]] = 0;
        }

        // Apply expression blend shape
        if (expression !== 'neutral' && expressionIntensity > 0) {
          const expressionIndex = object.morphTargetDictionary[expression]; // e.g., 'happy', 'sad', 'angry'
          if (expressionIndex !== undefined) {
            object.morphTargetInfluences[expressionIndex] = expressionIntensity;
          } else {
            console.warn(`ModelLoader: Blend shape for expression '${expression}' not found.`);
          }
        }
      }
    });

    // For the triangle.gltf, we'll continue to use color as a visual indicator for expression
    const mesh = scene.children[0] as Mesh;
    if (mesh && mesh.material instanceof MeshStandardMaterial) {
      let targetColor = new Color('royalblue'); // Default color
      if (expression === 'happy') {
        targetColor = new Color(0x00ff00); // Green for happy
      } else if (expression === 'sad') {
        targetColor = new Color(0x0000ff); // Blue for sad
      } else if (expression === 'angry') {
        targetColor = new Color(0xff0000); // Red for angry
      }
      mesh.material.color.lerp(targetColor, expressionIntensity); // Interpolate color
    }
  }, [scene, expression, expressionIntensity]);

  // Effect for controlling scale based on speaking state (lip-sync simulation)
  useEffect(() => {
    if (!scene) return;
    const mesh = scene.children[0] as Mesh;
    if (mesh) {
      if (isSpeaking) {
        mesh.scale.set(1.2, 1.2, 1.2);
      } else {
        mesh.scale.set(1, 1, 1);
      }
    }
  }, [scene, isSpeaking]);


  // Defensive check: useGLTF should typically throw on error, but this adds a safeguard.
  if (!scene) {
    console.error("ModelLoader: GLTF scene is not available after loading. This might indicate a loading error not caught by Suspense.");
    // In a production application, a more robust error boundary would catch this.
    return null; // Render nothing or a simple fallback mesh
  }

  return <primitive ref={group} object={scene} />;
}

