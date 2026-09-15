import { useEffect, useMemo, useState } from "react";
import "./HistoryPage.css";

const formatDate = (value) => {
  const date = value && new Date(value);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "-";
};

const formatTime = (value) => {
  const date = value && new Date(value);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour12: false }) : "-";
};

const formatCoordinate = (value) => Number.isFinite(Number(value)) ? Number(value).toFixed(6) : "-";

const formatBoundingBox = (box = {}) => {
  const values = [box.xmin, box.ymin, box.xmax, box.ymax];
  return values.every((value) => value !== null && value !== undefined)
    ? `(${box.xmin}, ${box.ymin}) - (${box.xmax}, ${box.ymax})`
    : "-";
};

export default function HistoryPage({ apiBaseUrl }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/api/history`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to load detection history.");
        setHistoryItems(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setHistoryItems([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [apiBaseUrl, refreshToken]);

  const visibleItems = useMemo(() => (
    selectedDate
      ? historyItems.filter((item) => item.date?.slice(0, 10) === selectedDate)
      : historyItems
  ), [historyItems, selectedDate]);
  const confidences = visibleItems.map((item) => Number(item.confidence)).filter(Number.isFinite);
  const averageConfidence = confidences.length
    ? ((confidences.reduce((total, confidence) => total + confidence, 0) / confidences.length) * 100).toFixed(1)
    : "0.0";
  const highestConfidence = confidences.length ? (Math.max(...confidences) * 100).toFixed(1) : "0.0";

  return (
    <main className="history-page">
      <div className="history-inner">
        <header className="history-header">
          <h1>Detection History</h1>
          <div className="history-status"><span /> Database archive</div>
        </header>

        <section className="history-summary" aria-label="Detection summary">
          <div className="history-summary-card history-summary-card-primary">
            <span className="history-summary-label">Total detections</span>
            <strong>{visibleItems.length}</strong>
            <span className="history-summary-note">Uploaded image results</span>
          </div>
          <div className="history-summary-card">
            <span className="history-summary-label">Average confidence</span>
            <strong>{averageConfidence}%</strong>
            <span className="history-summary-note">Model certainty</span>
          </div>
          <div className="history-summary-card">
            <span className="history-summary-label">Best confidence</span>
            <strong>{highestConfidence}%</strong>
            <span className="history-summary-note">Highest database result</span>
          </div>
        </section>

        <div className="history-toolbar">
          <div>
            <span className="history-section-title">Recent activity</span>
            <span className="history-section-subtitle">Results stored in MongoDB Atlas</span>
          </div>
          <label htmlFor="history-date">
            <span>Date filter</span>
            <input
              id="history-date"
              className="history-filter"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="history-refresh"
            onClick={() => setRefreshToken((token) => token + 1)}
            disabled={loading}
            title="Refresh detection history"
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="history-table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Confidence</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Date</th>
                <th>Timestamp</th>
                <th>Bounding Box (xmin, ymin - xmax, ymax)</th>
                <th>Image ID</th>
                <th>Image Name</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="history-empty" colSpan="9">Loading database history...</td></tr>}
              {!loading && error && <tr><td className="history-empty history-error" colSpan="9">{error}</td></tr>}
              {!loading && !error && visibleItems.length === 0 && (
                <tr><td className="history-empty" colSpan="9">No uploaded image detections found.</td></tr>
              )}
              {!loading && !error && visibleItems.map((item) => (
                <tr key={item.predicted_id || `${item.image_id}-${item.object}-${item.timestamp}`}>
                  <td>{item.object}</td>
                  <td><span className="history-confidence">{(Number(item.confidence || 0) * 100).toFixed(1)}%</span></td>
                  <td className="history-mono">{formatCoordinate(item.latitude)}</td>
                  <td className="history-mono">{formatCoordinate(item.longitude)}</td>
                  <td className="history-mono">{formatDate(item.date)}</td>
                  <td className="history-mono">{formatTime(item.timestamp)}</td>
                  <td className="history-mono">{formatBoundingBox(item.bounding_box)}</td>
                  <td className="history-mono history-id">{item.image_id || "-"}</td>
                  <td>{item.image_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
