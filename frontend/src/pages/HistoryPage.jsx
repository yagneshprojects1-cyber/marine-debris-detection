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

/** Return a numeric epoch from the item's timestamp field for reliable sorting. */
const toEpoch = (item) => {
  const d = item.timestamp && new Date(item.timestamp);
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
};

/** Small arrow indicator shown next to the active sort column header. */
function SortArrow({ column, sortCol, sortDir }) {
  if (sortCol !== column) return <span className="sort-arrow sort-arrow--idle">↕</span>;
  return (
    <span className="sort-arrow sort-arrow--active">
      {sortDir === "desc" ? "↓" : "↑"}
    </span>
  );
}

export default function HistoryPage({ apiBaseUrl, lastDetectionTime = 0, onShowHistoryDetection }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  // sortCol: "date" | "timestamp" | null  —  sortDir: "desc" | "asc"
  const [sortCol, setSortCol] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");

  // selection: Set of image_ids currently checked
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiBaseUrl}/api/history`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to load detection history.");
        setHistoryItems(Array.isArray(data) ? data : []);
        setSelectedIds(new Set()); // clear selection on refresh
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
  }, [apiBaseUrl, refreshToken, lastDetectionTime]);

  /** Toggle sort: clicking the active column flips direction; clicking a new column sets desc. */
  const handleSortClick = (col) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return col;
      }
      setSortDir("desc");
      return col;
    });
  };

  const visibleItems = useMemo(() => {
    const filtered = selectedDate
      ? historyItems.filter((item) => item.date?.slice(0, 10) === selectedDate)
      : historyItems;

    if (!sortCol) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = toEpoch(a);
      const bVal = toEpoch(b);
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [historyItems, selectedDate, sortCol, sortDir]);

  // Unique image_ids present in the current visible list
  const visibleImageIds = useMemo(
    () => [...new Set(visibleItems.map((i) => i.image_id).filter(Boolean))],
    [visibleItems]
  );

  const allVisibleSelected =
    visibleImageIds.length > 0 && visibleImageIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleImageIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleImageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...visibleImageIds]));
    }
  };

  const toggleRow = (imageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(imageId) ? next.delete(imageId) : next.add(imageId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    const imageCount = selectedIds.size;
    if (!window.confirm(`Delete all records for ${imageCount} image${imageCount !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/history`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_ids: [...selectedIds] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Delete failed.");
      // Refresh list after successful delete
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

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
            disabled={loading || deleting}
            title="Refresh detection history"
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Delete toolbar — only visible when rows are selected */}
        {someVisibleSelected && (
          <div className="history-delete-bar">
            <span className="history-delete-count">
              {selectedIds.size} image{selectedIds.size !== 1 ? "s" : ""} selected
              {" "}({visibleItems.filter((i) => selectedIds.has(i.image_id)).length} row{visibleItems.filter((i) => selectedIds.has(i.image_id)).length !== 1 ? "s" : ""})
            </span>
            {deleteError && <span className="history-delete-err">{deleteError}</span>}
            <button
              type="button"
              className="history-delete-btn"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "🗑 Delete selected"}
            </button>
            <button
              type="button"
              className="history-deselect-btn"
              onClick={() => setSelectedIds(new Set())}
              disabled={deleting}
            >
              Clear selection
            </button>
          </div>
        )}

        <div className="history-table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th className="th-check">
                  <input
                    type="checkbox"
                    className="history-checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                    onChange={toggleAll}
                    disabled={visibleImageIds.length === 0}
                    title="Select / deselect all visible images"
                  />
                </th>
                <th>Object</th>
                <th>Confidence</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th
                  className="th-sortable"
                  onClick={() => handleSortClick("date")}
                  title="Sort by date"
                >
                  Date <SortArrow column="date" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className="th-sortable"
                  onClick={() => handleSortClick("timestamp")}
                  title="Sort by timestamp"
                >
                  Timestamp <SortArrow column="timestamp" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th>Bounding Box (xmin, ymin - xmax, ymax)</th>
                <th>Image ID</th>
                <th>Image Name</th>
                <th>2D Map</th>
                <th>3D Map</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="history-empty" colSpan="12">Loading database history...</td></tr>}
              {!loading && error && <tr><td className="history-empty history-error" colSpan="12">{error}</td></tr>}
              {!loading && !error && visibleItems.length === 0 && (
                <tr><td className="history-empty" colSpan="12">No uploaded image detections found.</td></tr>
              )}
              {!loading && !error && visibleItems.map((item) => {
                const rowKey = item.predicted_id || `${item.image_id}-${item.object}-${item.timestamp}`;
                const isSelected = selectedIds.has(item.image_id);
                return (
                  <tr
                    key={rowKey}
                    className={isSelected ? "history-row--selected" : ""}
                  >
                    <td className="td-check">
                      <input
                        type="checkbox"
                        className="history-checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(item.image_id)}
                        title={`Select image ${item.image_name || item.image_id}`}
                      />
                    </td>
                    <td>{item.object}</td>
                    <td><span className="history-confidence">{(Number(item.confidence || 0) * 100).toFixed(1)}%</span></td>
                    <td className="history-mono">{formatCoordinate(item.latitude)}</td>
                    <td className="history-mono">{formatCoordinate(item.longitude)}</td>
                    <td className="history-mono">{formatDate(item.date)}</td>
                    <td className="history-mono">{formatTime(item.timestamp)}</td>
                    <td className="history-mono">{formatBoundingBox(item.bounding_box)}</td>
                    <td className="history-mono history-id">{item.image_id || "-"}</td>
                    <td>{item.image_name || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="history-map-button"
                        onClick={() => onShowHistoryDetection?.(item, "maps")}
                        disabled={!Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))}
                      >
                        Show on 2D Map
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="history-map-button history-map-button-3d"
                        onClick={() => onShowHistoryDetection?.(item, "3d-map")}
                        disabled={!Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))}
                      >
                        Show in 3D Map
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
