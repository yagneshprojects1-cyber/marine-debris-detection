import { useMemo } from "react";
import * as THREE from "three";
import { createTerrainGeometry } from "../../utils/terrain";

export function getDepthColor(normalizedDepth) {
  const depth = Math.max(0, Math.min(1, normalizedDepth));
  const deep = new THREE.Color("#062b42");
  const mid = new THREE.Color("#164d7a");
  const shelf = new THREE.Color("#3f8ec4");
  const shallow = new THREE.Color("#6dc6ef");
  const surface = new THREE.Color("#dff8ff");

  let color;

  if (depth < 0.35) {
    color = deep.clone().lerp(mid, depth / 0.35);
  } else if (depth < 0.7) {
    color = mid.clone().lerp(shelf, (depth - 0.35) / 0.35);
  } else if (depth < 0.9) {
    color = shelf.clone().lerp(shallow, (depth - 0.7) / 0.2);
  } else {
    color = shallow.clone().lerp(surface, (depth - 0.9) / 0.1);
  }

  return color;
}

export default function Terrain({ anchorX, anchorZ, depth }) {
  const geometry = useMemo(
    () => createTerrainGeometry(anchorX, anchorZ, depth),
    [anchorX, anchorZ, depth],
  );
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.1,
  }), []);

  const coloredGeometry = useMemo(() => {
    const colored = geometry.clone();
    const positions = colored.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let index = 0; index < positions.length; index += 3) {
      const normalizedHeight = Math.max(0, Math.min(1, (positions[index + 1] + depth + 20) / 40));
      const color = getDepthColor(normalizedHeight);
      const textureVariation = 1 + (Math.sin(positions[index] * 0.6 + positions[index + 2] * 0.7) + 1) * 0.08;
      colors[index] = color.r * textureVariation;
      colors[index + 1] = color.g * textureVariation;
      colors[index + 2] = color.b * textureVariation;
    }
    colored.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return colored;
  }, [geometry, depth]);

  return (
    <group>
      <mesh geometry={coloredGeometry} material={material} receiveShadow />
      <mesh geometry={coloredGeometry}>
        <meshBasicMaterial color="#75aeba" wireframe transparent opacity={0.035} />
      </mesh>
    </group>
  );
}