/**
 * BatchUploadPanel
 *
 * Displays the live status of every image in a batch run:
 *   queued → preprocessing → detecting → done / error
 *
 * Props:
 *   items  — array of { filename, phase, result, error }
 *            phase: "queued" | "preprocessing" | "detecting" | "done" | "error"
 *   summary — optional { total, accepted, rejected } from the preprocess response
 *   onItemClick — optional callback for completed items with detection results
 */
export default function BatchUploadPanel({ items, summary, onItemClick, selectedImageId }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="batch-panel">
      {summary && (
        <div className="batch-summary">
          <span className="batch-summary-total">{summary.total} images</span>
          <span className="batch-summary-ok">✓ {summary.accepted} matched</span>
          {summary.rejected > 0 && (
            <span className="batch-summary-err">✗ {summary.rejected} skipped</span>
          )}
        </div>
      )}

      {items.some((item) => item.phase === "done" && item.result) && (
        <p className="batch-click-hint">Click a card for detailed results.</p>
      )}

      <ul className="batch-item-list">
        {items.map((item, idx) => {
          const canOpen = item.phase === "done" && item.result;
          const active = selectedImageId && item.result?.image_id === selectedImageId;

          return (
          <li key={item.filename + idx} className="batch-item-shell">
            <button
              type="button"
              className={`batch-item batch-item--${item.phase}${canOpen ? " batch-item--clickable" : ""}${active ? " active" : ""}`}
              onClick={() => canOpen && onItemClick?.(item)}
              disabled={!canOpen}
              title={canOpen ? `Open details for ${item.filename}` : phaseLabel(item.phase, item.result)}
            >
              <PhaseIcon phase={item.phase} />
              <span className="batch-item-name" title={item.filename}>{item.filename}</span>
              <span className="batch-item-status">
                {phaseLabel(item.phase, item.result)}
              </span>
              {item.error && (
                <span className="batch-item-error" title={item.error}>
                  {item.error}
                </span>
              )}
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

function PhaseIcon({ phase }) {
  const map = {
    queued:        <span className="batch-icon batch-icon--queued">○</span>,
    preprocessing: <span className="batch-icon batch-icon--busy">◌</span>,
    detecting:     <span className="batch-icon batch-icon--busy">◌</span>,
    done:          <span className="batch-icon batch-icon--done">●</span>,
    error:         <span className="batch-icon batch-icon--error">✗</span>,
  };
  return map[phase] || null;
}

function phaseLabel(phase, result) {
  switch (phase) {
    case "queued":        return "Queued";
    case "preprocessing": return "Preprocessing…";
    case "detecting":     return "Detecting…";
    case "error":         return "Failed";
    case "done": {
      const detections = result?.objects_detected || [];
      const names = [...new Set(detections.map((item) => item.name).filter(Boolean))];
      const count = detections.length;
      if (count === 0) return "No detections";
      return `${names.join(", ")} | ${count} object${count !== 1 ? "s" : ""}`;
    }
    default: return "";
  }
}
