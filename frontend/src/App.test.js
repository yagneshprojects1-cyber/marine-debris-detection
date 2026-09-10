import { getMarkerLabel } from './pages/MapComponent';

describe('getMarkerLabel', () => {
  test('uses the total detected object count for all detection markers', () => {
    expect(
      getMarkerLabel({
        point: { objectName: 'Plastic bottle' },
        index: 1,
        isStart: false,
        markerCount: 3,
        routeDataLength: 3,
      })
    ).toBe('3');
  });

  test('keeps waypoint numbering for optimized route markers', () => {
    expect(
      getMarkerLabel({
        point: { step_number: 3 },
        index: 2,
        isStart: false,
        markerCount: 7,
        routeDataLength: 5,
      })
    ).toBe('3');
  });
});
