export default function DetectionResults({ detectionResult }) {
  if (!detectionResult) return null;

  const detections = detectionResult.objects_detected || [];
  const hasShipPosition = Number.isFinite(Number(detectionResult.ship_latitude)) &&
    Number.isFinite(Number(detectionResult.ship_longitude)) &&
    Number(detectionResult.ship_latitude) !== 0 &&
    Number(detectionResult.ship_longitude) !== 0;
  const summaryMessage = String(detectionResult.message || "")
    .split(/\s*ship position\s*:/i)[0]
    .trim();
  return (
    <section className="results-section">
      <h3 className="results-heading">Detection Results</h3>
      {summaryMessage && <p className="results-summary">{summaryMessage}</p>}

      {hasShipPosition && (
        <div
          className="ship-position-summary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "8px 12px",
            background: "#161b22",
            borderRadius: "6px",
            border: "1px solid #30363d",
            marginBottom: "16px",
            fontSize: "13px",
          }}
        >
          <strong style={{ color: "#e6edf3" }}>Ship Position:</strong>
          {detectionResult.ship_water_body && (
            <span style={{ color: "#58a6ff", fontWeight: 600 }}>
              {detectionResult.ship_water_body}
            </span>
          )}
          <span className="mono" style={{ color: "#8b949e" }}>
            Latitude <strong style={{ color: "#e6edf3" }}>{Number(detectionResult.ship_latitude).toFixed(6)}</strong>
          </span>
          <span className="mono" style={{ color: "#8b949e" }}>
            Longitude <strong style={{ color: "#e6edf3" }}>{Number(detectionResult.ship_longitude).toFixed(6)}</strong>
          </span>
        </div>
      )}

      {detections.length > 0 && (
        <div className="table-scroll">
          <table className="detection-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Confidence</th>
                <th>Range</th>
                <th>Depth</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Bounding Box (xmin, ymin - xmax, ymax)</th>
              </tr>
            </thead>
            <tbody>
              {detections.map((object, index) => (
                <tr key={`${object.name}-${index}`}>
                  <td>{object.name}</td>
                  <td><span className="confidence-pill">{object.confidence == null ? "XML annotation" : `${(object.confidence * 100).toFixed(1)}%`}</span></td>
                  <td className="mono">{object.sonar_range.toFixed(2)} m</td>
                  <td className="mono">{object.depth.toFixed(2)} m</td>
                  <td className="mono">{object.latitude == null ? "-" : object.latitude}</td>
                  <td className="mono">{object.longitude == null ? "-" : object.longitude}</td>
                  <td className="mono">
                    ({object.bndbox.xmin}, {object.bndbox.ymin}) - ({object.bndbox.xmax},{" "}
                    {object.bndbox.ymax})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}