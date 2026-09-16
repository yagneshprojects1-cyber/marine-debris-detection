import React from "react";

export default function VerifiedDebrisList({ debris = [], isLoading, error, onSelectDebris }) {
  return (
    <div className="analyst-surveys-container">
      <div className="surveys-header">
        <div>
          <h2>Verified Debris Objects</h2>
          <p className="surveys-subtitle">Validated objects fetched directly from the ai_predictions collection.</p>
        </div>
        <div className="surveys-count-badge">{debris.length} Verified debris</div>
      </div>
      {isLoading ? (
        <div className="empty-surveys-box"><p>Loading verified debris...</p></div>
      ) : error ? (
        <div className="empty-surveys-box"><p>{error}</p></div>
      ) : debris.length === 0 ? (
        <div className="empty-surveys-box"><p>No validated debris objects found.</p></div>
      ) : (
        <div className="surveys-table-wrapper">
          <table className="surveys-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Confidence</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Survey ID</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {debris.map((item) => (
                <tr key={item.id}>
                  <td><strong className="survey-table-title">{item.name}</strong></td>
                  <td>{(Number(item.confidence || 0) * 100).toFixed(1)}%</td>
                  <td>{Number(item.latitude || 0).toFixed(6)}</td>
                  <td>{Number(item.longitude || 0).toFixed(6)}</td>
                  <td><span className="survey-id-tag">{item.survey_id}</span></td>
                  <td><span className="status-badge badge-validated">{item.status}</span></td>
                  <td>
                    <button type="button" className="btn-inspect-survey-table" onClick={() => onSelectDebris?.(item)}>
                      Inspect &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
