export const DEFAULT_LATITUDE = 18.922;
export const DEFAULT_LONGITUDE = 72.8347;

export function normalizeGeneratedPositions(rows = []) {
  return rows
    .map((row) => ({
      ...row,
      lat: Number(row.object_latitude),
      lng: Number(row.object_longitude),
      label: row.object_class,
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

export function normalizeDetectionPoints(objects = []) {
  return objects
    .filter((object) => object && object.confidence != null && object.confidence !== undefined && Number(object.confidence) > 0)
    .map((object) => {
      const latitude = Number(object.latitude);
      const longitude = Number(object.longitude);
      const hasCalculatedPosition = Number.isFinite(latitude) && Number.isFinite(longitude);

      return {
        lat: hasCalculatedPosition ? latitude : DEFAULT_LATITUDE,
        lng: hasCalculatedPosition ? longitude : DEFAULT_LONGITUDE,
        objectName: object.name,
        confidence: object.confidence,
        label: `${object.name} (${(object.confidence * 100).toFixed(1)}%)`,
        source: hasCalculatedPosition ? "detection" : "default detection position",
      };
    });
}