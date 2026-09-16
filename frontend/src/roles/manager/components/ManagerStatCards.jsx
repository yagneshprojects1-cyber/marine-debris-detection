import React from "react";

export default function ManagerStatCards({ stats, activeFilter, onFilterChange }) {
  const cards = [
    {
      key: "total_detections",
      label: "Total Detections",
      value: stats?.total_detections ?? 0,
      icon: "🔍",
      color: "teal",
    },
    {
      key: "validated",
      label: "Validated",
      value: stats?.validated ?? 0,
      icon: "✅",
      color: "cyan",
    },
    {
      key: "approved",
      label: "Approved",
      value: stats?.approved ?? 0,
      icon: "✅",
      color: "green",
    },
    {
      key: "removed",
      label: "Removed",
      value: stats?.removed ?? 0,
      icon: "🌊",
      color: "green",
    },
  ];

  return (
    <div className="manager-stat-cards-grid">
      {cards.map((card) => {
        const isActive = activeFilter === card.key;
        return (
          <div
            key={card.key}
            className={`manager-stat-card card-${card.color} ${isActive ? "active" : ""}`}
            onClick={() => onFilterChange && onFilterChange(card.key)}
            role="button"
            tabIndex={0}
          >
            <div className="stat-card-header">
              <span className="stat-card-icon">{card.icon}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
            <div className="stat-card-value">{card.value}</div>
            <div className="stat-card-footer">
              <span>Detected anomalies</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
