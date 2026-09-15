import * as THREE from "three";

function terrainWave(x, z) {
  const broadShape = Math.sin(x / 100) * 12 + Math.cos(z / 100) * 12;
  const ridges = Math.sin((x + z) / 50) * 5;
  const smallUndulation = Math.sin(x / 19) * 1.8 + Math.cos(z / 27) * 1.4;
  return broadShape + ridges + smallUndulation;
}

export function getTerrainY(x, z, anchorX, anchorZ, anchorDepth) {
  const anchorWave = terrainWave(anchorX, anchorZ);
  const relativeWave = (terrainWave(x, z) - anchorWave) * 0.35;
  return Math.min(-0.5, -anchorDepth + relativeWave);
}

export function createTerrainGeometry(anchorX, anchorZ, anchorDepth) {
  const geometry = new THREE.PlaneGeometry(500, 500, 100, 100);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position.array;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index + 1] = getTerrainY(
      positions[index],
      positions[index + 2],
      anchorX,
      anchorZ,
      anchorDepth,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}