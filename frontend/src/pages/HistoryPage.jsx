import { useEffect, useMemo, useState } from "react";
import DetectionResults from "../components/upload/DetectionResults";
import MapPage from "./MapPage";
import ThreeDMapPage from "./ThreeDMapPage";
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

const ITEMS_PER_PAGE = 15;

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
};

export default function HistoryPage({ apiBaseUrl }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyDetailView, setHistoryDetailView] = useState("results");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE));
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleItems.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, visibleItems]);
  const confidences = visibleItems.map((item) => Number(item.confidence)).filter(Number.isFinite);
  const averageConfidence = confidences.length
    ? ((confidences.reduce((total, confidence) => total + confidence, 0) / confidences.length) * 100).toFixed(1)
    : "0.0";
  const highestConfidence = confidences.length ? (Math.max(...confidences) * 100).toFixed(1) : "0.0";

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, refreshToken]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleGetDetails = (item) => {
    setSelectedHistoryItem(item);
    setHistoryDetailView("results");
    window.requestAnimationFrame(() => {
      document.querySelector(".history-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const selectedDetail = selectedHistoryItem
    ? {
        image_id: selectedHistoryItem.image_id,
        ship_latitude: Number(selectedHistoryItem.latitude) || 0,
        ship_longitude: Number(selectedHistoryItem.longitude) || 0,
        objects_detected: [{
          name: selectedHistoryItem.object,
          confidence: Number(selectedHistoryItem.confidence) || 0,
          latitude: Number(selectedHistoryItem.latitude) || 0,
          longitude: Number(selectedHistoryItem.longitude) || 0,
          depth: 0,
          local_x: 0,
          local_z: 0,
          sonar_range: 0,
          sonar_azimuth: 0,
          sonar_elevation: 0,
          sonar_soundspeed: 1500,
          sonar_frequency: 0,
          bndbox: {
            xmin: 0,
            ymin: 0,
            xmax: 0,
            ymax: 0,
          },
        }],
      }
    : null;

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
            <colgroup>
              <col className="history-col-serial" />
              <col className="history-col-details" />
              <col className="history-col-object" />
              <col className="history-col-confidence" />
              <col className="history-col-coordinate" />
              <col className="history-col-coordinate" />
              <col className="history-col-date" />
              <col className="history-col-date" />
              <col className="history-col-bounding-box" />
              <col className="history-col-id" />
              <col className="history-col-image" />
            </colgroup>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Details</th>
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
              {loading && <tr><td className="history-empty" colSpan="11">Loading database history...</td></tr>}
              {!loading && error && <tr><td className="history-empty history-error" colSpan="11">{error}</td></tr>}
              {!loading && !error && visibleItems.length === 0 && (
                <tr><td className="history-empty" colSpan="11">No uploaded image detections found.</td></tr>
              )}
              {!loading && !error && paginatedItems.map((item, index) => (
                <tr key={item.predicted_id || `${item.image_id}-${item.object}-${item.timestamp}`}>
                  <td className="history-serial">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                  <td>
                    <button
                      type="button"
                      className="history-detail-button"
                      onClick={() => handleGetDetails(item)}
                    >
                      Get Details
                    </button>
                  </td>
                  <td>{item.object}</td>
                  <td><span className="history-confidence">{(Number(item.confidence || 0) * 100).toFixed(1)}%</span></td>
                  <td className="history-mono">{formatCoordinate(item.latitude)}</td>
                  <td className="history-mono">{formatCoordinate(item.longitude)}</td>
                  <td className="history-mono">{formatDate(item.date)}</td>
                  <td className="history-mono">{formatTime(item.timestamp)}</td>
                  <td className="history-mono">{formatBoundingBox(item.bounding_box)}</td>
                  <td className="history-mono history-id">{item.image_id || "-"}</td>
                  <td>
                    <div className="history-row-actions">
                      <span>{item.image_name || "-"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleItems.length > 0 && (
          <nav className="history-pagination" aria-label="Detection history pages">
            <button
              type="button"
              className="history-page-button history-page-arrow"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &#8249;
            </button>
            {pageNumbers.map((page) => (
              page.toString().startsWith("ellipsis") ? (
                <span key={page} className="history-page-ellipsis" aria-hidden="true">...</span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`history-page-button${currentPage === page ? " active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )
            ))}
            <button
              type="button"
              className="history-page-button history-page-arrow"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              &#8250;
            </button>
          </nav>
        )}

        {selectedDetail && (
          <section className="history-detail-panel" aria-label="Selected history item details">
            <div className="history-detail-header">
              <div>
                <span className="history-detail-eyebrow">Selected history record</span>
                <h2>{selectedHistoryItem.object}</h2>
              </div>
              <button
                type="button"
                className="history-detail-close"
                onClick={() => setSelectedHistoryItem(null)}
              >
                <span aria-hidden="true">←</span>
                <span>Back</span>
              </button>
            </div>

            <div className="history-detail-tabs" role="tablist" aria-label="History item views">
              {[
                { id: "results", label: "Detection Results" },
                { id: "2d", label: "2D Map" },
                { id: "3d", label: "3D Map" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={historyDetailView === tab.id}
                  className={historyDetailView === tab.id ? "active" : ""}
                  onClick={() => setHistoryDetailView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="history-detail-content">
              {historyDetailView === "results" && <DetectionResults detectionResult={selectedDetail} />}
              {historyDetailView === "2d" && (
                <div className="history-detail-map">
                  <MapPage
                    apiBaseUrl={apiBaseUrl}
                    detectionPoints={selectedDetail.objects_detected}
                    detectionResult={selectedDetail}
                  />
                </div>
              )}
              {historyDetailView === "3d" && (
                <div className="history-detail-map">
                  <ThreeDMapPage
                    detections={selectedDetail.objects_detected}
                    shipLatitude={selectedDetail.ship_latitude}
                    shipLongitude={selectedDetail.ship_longitude}
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
