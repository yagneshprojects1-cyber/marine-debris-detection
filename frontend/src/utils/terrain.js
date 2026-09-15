import * as THREE from "three";

function terrainWave(x, z) {
  const gentleSwell = Math.sin(x / 45) * 1.6 + Math.cos(z / 50) * 1.6;
  const crossSwell = Math.sin((x + z) / 28) * 0.9;
  const microRipples = Math.sin(x / 14) * 0.4 + Math.cos(z / 16) * 0.4;
  return gentleSwell + crossSwell + microRipples;
}

export function getTerrainY(x, z, anchorX, anchorZ, anchorDepth) {
  const anchorWave = terrainWave(anchorX, anchorZ);
  const relativeWave = terrainWave(x, z) - anchorWave;
  const seabedRelief = relativeWave;
  const depthBase = -anchorDepth;
  return depthBase + seabedRelief;
}

export function createTerrainGeometry(anchorX, anchorZ, anchorDepth) {
  const geometry = new THREE.PlaneGeometry(500, 500, 120, 120);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position.array;
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const z = positions[index + 2];
    positions[index + 1] = getTerrainY(
      x,
      z,
      anchorX,
      anchorZ,
      anchorDepth,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}