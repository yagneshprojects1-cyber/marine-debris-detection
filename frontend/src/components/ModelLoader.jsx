import React, { useMemo, Suspense } from 'react';
import { Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { AI_API_BASE_URL } from '../config/api';

/**
 * Map detection object names to 3D model file paths
 * These files are served by the FastAPI backend from backend/3dmodels.
 */
const MODEL_BASE_URL = AI_API_BASE_URL.replace(/\/$/, '');
// Bump this value whenever a GLB is replaced so Drei/browser caches fetch the new asset.
const MODEL_ASSET_VERSION = '20260910-detection-models-v2';
const modelUrl = (filename) => `${MODEL_BASE_URL}/3dmodels/${encodeURIComponent(filename)}?v=${MODEL_ASSET_VERSION}`;
const MODEL_MAP = {
  'human body': modelUrl('human body.glb'),
  'ghost net': modelUrl('ghost net.glb'),
  'ship': modelUrl('ship.glb'),
  'ship wreck': modelUrl('ship.glb'),
  'plane wreck': modelUrl('plane.glb'),
  'plane': modelUrl('plane.glb'),
  'ball': modelUrl('ball.glb'),
  'square cage': modelUrl('square cage.glb'),
  'cage': modelUrl('square cage.glb'),
  'tyre': modelUrl('tyre.glb'),
  'tire': modelUrl('tyre.glb'),
  'wreck': modelUrl('ship.glb'),
  'net': modelUrl('ghost net.glb'),
};
const ROV_MODEL_URL = modelUrl('rov.glb');

export function hasModelForDetection(name) {
  const objectName = name ? name.toLowerCase().trim() : "";
  return Boolean(MODEL_MAP[objectName]);
}

/**
 * Fallback sphere when model is not found
 */
export function FallbackSphere({ size = 2, color = '#ffaa00' }) {
  return (
    <mesh>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={0.5}
        wireframe={false}
      />
    </mesh>
  );
}

export function FallbackCube({ size = 8, color = '#ffaa00', label = '3D Model not available' }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
        />
      </mesh>
      <Text
        position={[0, size * 0.9, 0]}
        fontSize={Math.max(1.4, size * 0.18)}
        color="#ffe1a3"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.1}
        outlineColor="#06283d"
        depthOffset={-1}
      >
        {`(${label})`}
      </Text>
    </group>
  );
}

/**
 * Model component that loads GLTF/GLB files
 * Renders only the requested backend model; failures render nothing.
 */
const MODEL_TARGET_SIZE = {
  'human body': 6,
  'ghost net': 24,
  'ship': 32,
  'ship wreck': 32,
  'wreck': 32,
  'plane': 12,
  'plane wreck': 12,
  'ball': 5,
  'square cage': 12,
  'cage': 12,
  'tyre': 10,
  'tire': 10,
  rov: 24,
};

function ModelWithGLTF({ modelPath, objectName, scale = 1 }) {
  const gltfData = useGLTF(modelPath);

  const clonedScene = useMemo(() => {
    // Only proceed if we have a valid scene
    if (!gltfData || !gltfData.scene) {
      return null;
    }
    
    try {
      console.log(`✓ Creating cloned scene for ${modelPath}`);
      const clone = gltfData.scene.clone(true);
      const bounds = new THREE.Box3().setFromObject(clone);
      const size = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const targetSize = MODEL_TARGET_SIZE[objectName] || 12;

      if (maxDimension > 0) {
        const normalizedScale = targetSize / maxDimension;
        clone.scale.setScalar(normalizedScale);

        // Center the model horizontally and place its lowest point at the marker.
        const scaledBounds = new THREE.Box3().setFromObject(clone);
        const center = scaledBounds.getCenter(new THREE.Vector3());
        clone.position.x -= center.x;
        clone.position.z -= center.z;
        clone.position.y -= scaledBounds.min.y;
      }
      
      // Traverse and set up materials
      clone.traverse((node) => {
        if (node.isMesh) {
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map(m => m.clone());
            } else {
              node.material = node.material.clone();
            }
          }
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      return clone;
    } catch (error) {
      console.error(`❌ Error cloning scene for ${modelPath}:`, error);
      return null;
    }
  }, [gltfData, modelPath, objectName]);

  if (!clonedScene) {
    if (!gltfData || !gltfData.scene) {
      console.log(`⏳ Loading model... ${modelPath}`);
    } else {
      console.warn(`⚠️ Failed to create cloned scene for ${modelPath}`);
    }
    return null;
  }

  return (
    <group
      scale={[scale, scale, scale]}
      rotation={objectName === 'human body' ? [Math.PI / 2, 0, Math.PI] : [0, 0, 0]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Error boundary for model loading
 */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`✗ Model loading error: ${error.message}`, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * DetectionObject3D - Renders the appropriate 3D model based on detection type
 * Includes model loading for backend-provided assets only.
 */
export function DetectionObject3D({ detection, scale = 1, showLabel = true }) {
  const objectName = detection.name ? detection.name.toLowerCase().trim() : 'unknown';
  
  // Only mapped detections should create a 3D object.
  const modelPath = MODEL_MAP[objectName];
  const hasModel = !!modelPath;

  if (!hasModel) {
    return <FallbackCube />;
  }
  
  // Log which model we're trying to load
  if (hasModel) {
    console.log(`🔄 Loading 3D model for "${objectName}": ${modelPath}`);
  } else {
    console.log(`⚠ No 3D model found for "${objectName}", using fallback sphere`);
  }
  
  return (
    <group>
      <Suspense fallback={null}>
        <ModelErrorBoundary>
          <ModelWithGLTF modelPath={modelPath} objectName={objectName} scale={scale} />
        </ModelErrorBoundary>
      </Suspense>
    </group>
  );
}

export function ROVModel({ scale = 1 }) {
  return (
    <Suspense fallback={null}>
      <ModelErrorBoundary>
        <ModelWithGLTF modelPath={ROV_MODEL_URL} objectName="rov" scale={scale} />
      </ModelErrorBoundary>
    </Suspense>
  );
}

export default DetectionObject3D;
