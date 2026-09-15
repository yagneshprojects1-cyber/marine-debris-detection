import React from "react";

export default function ManagerStatCards({ stats, activeFilter, onFilterChange }) {
  const cards = [
    {
      key: "total_surveys",
      label: "Total Surveys",
      value: stats?.total_surveys ?? 0,
      icon: "📋",
      color: "blue",
    },
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
      key: "high_priority",
      label: "High Priority",
      value: stats?.high_priority ?? 0,
      icon: "⚠️",
      color: "red",
    },
    {
      key: "pending_review",
      label: "Pending Review",
      value: stats?.pending_review ?? 0,
      icon: "⏳",
      color: "yellow",
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
              <span>{card.key === "total_surveys" ? "Analyst sessions" : "Detected anomalies"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
