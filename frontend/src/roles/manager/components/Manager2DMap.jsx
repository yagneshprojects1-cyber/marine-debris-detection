import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Helper to construct custom SVG icons based on priority & status
const createCustomMarkerIcon = (priority, status) => {
  let color = "#3b82f6"; // Default blue
  if (priority === "High Priority") color = "#ef4444"; // Red
  else if (status === "Assigned for Removal") color = "#a855f7"; // Purple
  else if (status === "Removed") color = "#22c55e"; // Green
  else if (status === "Pending Review") color = "#eab308"; // Yellow

  const svgHtml = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "manager-custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
};

export default function Manager2DMap({ detections, onSelectDetectionFor3D }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDet, setSelectedDet] = useState(null);

  const filteredDetections = detections.filter((det) => {
    if (filterPriority !== "all" && det.priority !== filterPriority) return false;
    if (filterStatus !== "all" && det.status !== filterStatus) return false;
    return true;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around Mumbai Harbor area
      const map = L.map(mapContainerRef.current).setView([18.92, 72.78], 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    if (filteredDetections.length > 0) {
      const bounds = [];
      filteredDetections.forEach((det) => {
        if (!det.latitude || !det.longitude) return;

        const icon = createCustomMarkerIcon(det.priority, det.status);
        const marker = L.marker([det.latitude, det.longitude], { icon });

        const popupContent = document.createElement("div");
        popupContent.className = "manager-map-popup";
        popupContent.innerHTML = `
          <h4>${det.name}</h4>
          <p><strong>Survey ID:</strong> ${det.survey_id}</p>
          <p><strong>Priority:</strong> <span style="color: ${det.priority === 'High Priority' ? '#ef4444' : '#0ea5e9'}">${det.priority || 'Normal'}</span></p>
          <p><strong>Status:</strong> ${det.status}</p>
          <p><strong>Depth:</strong> ${det.depth}m | <strong>Operator:</strong> ${det.assigned_operator || 'Unassigned'}</p>
          <button class="popup-inspect-btn" id="btn-popup-${det.id}">Inspect 3D Model &rarr;</button>
        `;

        marker.bindPopup(popupContent);
        marker.on("popupopen", () => {
          setSelectedDet(det);
          const btn = document.getElementById(`btn-popup-${det.id}`);
          if (btn) {
            btn.onclick = () => onSelectDetectionFor3D && onSelectDetectionFor3D(det);
          }
        });

        markersGroup.addLayer(marker);
        bounds.push([det.latitude, det.longitude]);
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [filteredDetections]);

  return (
    <div className="manager-2d-map-wrapper">
      <div className="map-filter-bar">
        <div className="filter-title">
          🗺️ <strong>Manager 2D Cluster Map</strong>
          <span>Identify high priority anomaly clusters across all surveys</span>
        </div>

        <div className="filter-controls">
          <div className="filter-chip">
            <label>Priority:</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="all">All Priorities</option>
              <option value="High Priority">⚠️ High Priority</option>
              <option value="Medium Priority">🔶 Medium Priority</option>
              <option value="Normal">🔹 Normal</option>
            </select>
          </div>

          <div className="filter-chip">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="Pending Review">⏳ Pending Review</option>
              <option value="Validated">✅ Validated</option>
              <option value="Assigned for Removal">⚓ Assigned for Removal</option>
              <option value="Removed">🌊 Removed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="map-canvas-container" ref={mapContainerRef} />

      {selectedDet && (
        <div className="map-selected-detail-panel">
          <div className="selected-detail-header">
            <h4>Selected Anomaly: {selectedDet.name}</h4>
            <span className="survey-tag">{selectedDet.survey_id}</span>
          </div>
          <p className="notes-line">"{selectedDet.operational_notes || "No notes attached."}"</p>
          <div className="selected-detail-actions">
            <button
              type="button"
              className="btn-open-3d"
              onClick={() => onSelectDetectionFor3D && onSelectDetectionFor3D(selectedDet)}
            >
              Open Interactive 3D Visualizer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
