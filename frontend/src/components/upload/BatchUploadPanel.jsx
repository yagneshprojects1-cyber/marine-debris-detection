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
 */
export default function BatchUploadPanel({ items, summary }) {
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

      <ul className="batch-item-list">
        {items.map((item, idx) => (
          <li key={item.filename + idx} className={`batch-item batch-item--${item.phase}`}>
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
          </li>
        ))}
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
      const count = result?.objects_detected?.length ?? 0;
      return count > 0 ? `${count} object${count !== 1 ? "s" : ""} detected` : "No detections";
    }
    default: return "";
  }
}
