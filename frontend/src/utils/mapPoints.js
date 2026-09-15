export const DEFAULT_LATITUDE = 18.922;
export const DEFAULT_LONGITUDE = 72.8347;

export function normalizeGeneratedPositions(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ...row,
      lat: Number(row.object_latitude ?? row.latitude ?? row.lat),
      lng: Number(row.object_longitude ?? row.longitude ?? row.lng),
      label: row.object_class ?? row.name ?? row.type ?? "Generated Point",
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));
}

export function normalizeDetectionPoints(objects = []) {
  const list = Array.isArray(objects) ? objects : (objects ? [objects] : []);
  return list
    .filter((object) => object != null && typeof object === "object")
    .map((object) => {
      const latitude = Number(object.latitude ?? object.lat ?? object.object_latitude);
      const longitude = Number(object.longitude ?? object.lng ?? object.object_longitude);
      const hasCalculatedPosition = Number.isFinite(latitude) && Number.isFinite(longitude);

      const name = object.name || object.type || object.object_class || "Debris Object";
      const conf = object.confidence != null && !isNaN(Number(object.confidence)) ? Number(object.confidence) : 0.95;

      return {
        ...object,
        lat: hasCalculatedPosition ? latitude : DEFAULT_LATITUDE,
        lng: hasCalculatedPosition ? longitude : DEFAULT_LONGITUDE,
        objectName: name,
        confidence: conf,
        label: conf > 0 ? `${name} (${(conf * 100).toFixed(1)}%)` : name,
        source: hasCalculatedPosition ? "detection" : "default detection position",
      };
    });
}