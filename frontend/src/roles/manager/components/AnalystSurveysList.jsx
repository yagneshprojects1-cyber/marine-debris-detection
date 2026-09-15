import React, { useState } from "react";

export default function AnalystSurveysList({ surveys, onSelectSurvey, selectedSurveyId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredSurveys = surveys.filter((survey) => {
    if (filterStatus !== "all" && survey.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = survey.survey_id?.toLowerCase().includes(q);
      const matchTitle = survey.title?.toLowerCase().includes(q);
      const matchAnalyst = survey.analyst_name?.toLowerCase().includes(q);
      const matchNotes = survey.notes?.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchAnalyst && !matchNotes) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSurveys = filteredSurveys.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Validated":
        return <span className="status-badge badge-validated">Validated</span>;
      case "Assigned for Removal":
        return <span className="status-badge badge-assigned">Assigned for Removal</span>;
      case "Completed":
        return <span className="status-badge badge-completed">Completed</span>;
      case "Pending Review":
      default:
        return <span className="status-badge badge-pending">Pending Review</span>;
    }
  };

  return (
    <div className="analyst-surveys-container">
      <div className="surveys-header">
        <div>
          <h2>Analyst Conducted Surveys</h2>
          <p className="surveys-subtitle">
            Surveys conducted by Sonar Analysts and detected debris anomalies.
          </p>
        </div>
        <div className="surveys-count-badge">
          {filteredSurveys.length} {filteredSurveys.length === 1 ? "Survey" : "Surveys"} Listed
        </div>
      </div>

      <div className="surveys-filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by Survey ID, title, or analyst..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Survey Statuses</option>
          <option value="Pending Review">⏳ Pending Review</option>
          <option value="Validated">✅ Validated</option>
          <option value="Assigned for Removal">⚓ Assigned for Removal</option>
          <option value="Completed">🌊 Completed</option>
        </select>
      </div>

      {paginatedSurveys.length === 0 ? (
        <div className="empty-surveys-box">
          <p>No analyst surveys match your filter criteria or no sonar images have been uploaded yet.</p>
        </div>
      ) : (
        <div className="surveys-table-wrapper">
          <table className="surveys-table">
            <thead>
              <tr>
                <th>Survey ID</th>
                <th>Survey Title</th>
                <th>Sonar Analyst</th>
                <th>Location</th>
                <th>Date & Time</th>
                <th>Images</th>
                <th>Detections</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSurveys.map((survey) => {
                const isSelected = selectedSurveyId === survey.survey_id;
                return (
                  <tr
                    key={survey.survey_id}
                    className={`survey-list-row ${isSelected ? "selected" : ""}`}
                    onClick={() => onSelectSurvey(survey)}
                  >
                    <td>
                      <span className="survey-id-tag">{survey.survey_id}</span>
                    </td>
                    <td>
                      <strong className="survey-table-title">{survey.title}</strong>
                    </td>
                    <td>
                      <span className="meta-label">👤 {survey.analyst_name}</span>
                    </td>
                    <td>
                      <span className="meta-label">📍 {survey.location}</span>
                    </td>
                    <td>
                      <span className="meta-label">
                        {survey.timestamp ? new Date(survey.timestamp).toLocaleString() : "Recent"}
                      </span>
                    </td>
                    <td>
                      <span className="pill-number">{survey.image_count}</span>
                    </td>
                    <td>
                      <span className="pill-number highlight">
                        {survey.detections_count || survey.detections?.length || 0}
                      </span>
                    </td>
                    <td>{getStatusBadge(survey.status)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-inspect-survey-table"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSurvey(survey);
                        }}
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls (10 records each) */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          >
            &laquo; Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredSurveys.length} total surveys)
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
