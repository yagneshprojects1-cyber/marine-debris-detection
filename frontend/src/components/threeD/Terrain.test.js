import { getDepthColor } from './Terrain';
import { createTerrainGeometry } from '../../utils/terrain';

describe('getDepthColor', () => {
  test('maps the deepest areas to near-black and shallow areas to sky blue', () => {
    const deep = getDepthColor(0);
    const middle = getDepthColor(0.5);
    const shallow = getDepthColor(1);

    expect(deep.r).toBeLessThan(0.2);
    expect(deep.g).toBeLessThan(0.2);
    expect(deep.b).toBeLessThan(0.2);

    expect(middle.b).toBeGreaterThan(middle.r);
    expect(shallow.b).toBeGreaterThan(0.5);
    expect(shallow.g).toBeGreaterThan(0.5);
  });
});

describe('createTerrainGeometry', () => {
  test('creates meaningful relief instead of a flat navy plane', () => {
    const geometry = createTerrainGeometry(0, 0, 30);
    const positions = geometry.attributes.position.array;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 1; i < positions.length; i += 3) {
      const y = positions[i];
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    expect(maxY - minY).toBeGreaterThan(1);
    expect(maxY - minY).toBeLessThan(15);
  });
});
