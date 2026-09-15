import React, { useState, useCallback } from "react";
import MapComponent from "./MapComponent";
import SidePanel from "./SidePanel";
import "./MapPage.css";

export default function RouteOptimizationPage({ apiBaseUrl }) {
  const [rawTargets, setRawTargets] = useState([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [optimalRoute, setOptimalRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);

  // Client-side CSV parser fallback
  const parseCsvText = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const latIdx = headers.findIndex((h) => h.includes("lat") || h === "y");
    const lonIdx = headers.findIndex((h) => h.includes("lon") || h.includes("lng") || h === "x");
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("label") || h.includes("id"));

    const targets = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length <= Math.max(latIdx, lonIdx)) continue;

      const lat = parseFloat(parts[latIdx]);
      const lon = parseFloat(parts[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const name = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : `Debris #${i}`;
      targets.push({
        id: `target_${i}`,
        name: name,
        latitude: lat,
        longitude: lon,
      });
    }
    return targets;
  };

  // Compute optimal route from chosen source to all remaining targets
  const computeRoute = useCallback(
    async (sourceId, targetsList) => {
      if (!targetsList || targetsList.length === 0) return;

      const sourcePoint = targetsList.find((t) => String(t.id) === String(sourceId)) || targetsList[0];
      const otherTargets = targetsList.filter((t) => String(t.id) !== String(sourcePoint.id));

      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(`${apiBaseUrl}/api/optimal-debris-route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: sourcePoint,
            targets: otherTargets,
            speed_knots: 12.0,
            fuel_rate_lph: 25.0,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to calculate optimal route");

        setOptimalRoute(data);
      } catch (err) {
        setErrorMsg(err.message || "Failed to calculate route");
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl]
  );

  // Handle custom CSV upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg("");
      setOptimalRoute(null);
      setSelectedWaypoint(null);

      // Send to server parse endpoint
      const formData = new FormData();
      formData.append("file", file);

      let parsedList = [];
      const res = await fetch(`${apiBaseUrl}/api/parse-debris-csv`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        parsedList = data.targets || [];
      } else {
        // Fallback to client-side parsing
        const fileText = await file.text();
        parsedList = parseCsvText(fileText);
      }

      if (!parsedList || parsedList.length === 0) {
        throw new Error("No valid coordinates found in uploaded CSV file.");
      }

      setRawTargets(parsedList);
      const initialSourceId = parsedList[0].id;
      setSelectedSourceId(initialSourceId);

      // Compute initial route starting from first item
      await computeRoute(initialSourceId, parsedList);
    } catch (err) {
      setErrorMsg(err.message || "Failed to process CSV file");
    } finally {
      setLoading(false);
    }
  };

  // Handle source location change by user
  const handleSourceChange = (e) => {
    const newSourceId = e.target.value;
    setSelectedSourceId(newSourceId);
    computeRoute(newSourceId, rawTargets);
  };

  // Map route markers & path data
  const routeData =
    optimalRoute?.waypoints?.map((wp) => ({
      id: wp.id,
      lat: wp.latitude,
      lng: wp.longitude,
      objectName: wp.name,
      step_number: wp.step_number,
      label: `#${wp.step_number} ${wp.name}`,
    })) ||
    rawTargets.map((t, idx) => ({
      id: t.id,
      lat: t.latitude,
      lng: t.longitude,
      objectName: t.name,
      step_number: idx + 1,
      label: t.name,
    }));

  return (
    <div className="map-page-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top Action Bar */}
      <div
        style={{
          padding: "10px 20px",
          background: "#0d1117",
          borderBottom: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          zIndex: 10,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#e6edf3" }}>
            Marine Debris Route Optimization
          </h2>
          <span style={{ fontSize: 12, color: "#8b949e" }}>
            Upload a CSV file, choose a source point, and view the optimal trajectory to visit all debris locations.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rawTargets.length > 0 && (
            <span style={{ fontSize: 12, color: "#3fb950", fontWeight: 600, background: "#1c2128", padding: "4px 8px", borderRadius: 4, border: "1px solid #238636" }}>
              ✓ {rawTargets.length} Points Loaded
            </span>
          )}

          <label
            style={{
              padding: "7px 14px",
              background: "#238636",
              border: "1px solid #2ea043",
              borderRadius: 6,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📁 Upload Debris CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: "8px 24px", background: "#781113", color: "#ff7b72", fontSize: 13, fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Map + Sidebar Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div className="map-container" style={{ flex: 1, position: "relative" }}>
          <MapComponent
            routeData={routeData}
            pathColor="#2563eb"
            pathWeight={4}
            showMarkers={true}
            onMapClick={(coords) => {
              setClickedCoords(coords);
            }}
            onPointClick={(pt) => setSelectedWaypoint(pt)}
          />
        </div>

        {/* Compact Sidebar */}
        <div className="side-panel-container" style={{ width: 310, flexShrink: 0 }}>
          <SidePanel
            showEmptyPlaceholders={false}
            coordinates={clickedCoords}
            detection={selectedWaypoint}
            routeInfo={{
              waypoints: routeData.length,
            }}
          >
            {/* ======= SECTION 1: Source Location Selection ======= */}
            {rawTargets.length > 0 && (
              <div style={{ background: "#161b22", padding: 12, borderRadius: 8, border: "1px solid #30363d", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#58a6ff", fontWeight: 700, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📍</span> Select Source Point
                </div>
                <select
                  value={selectedSourceId}
                  onChange={handleSourceChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#0d1117",
                    border: "1px solid #30363d",
                    borderRadius: 6,
                    color: "#e6edf3",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {rawTargets.map((t, idx) => (
                    <option key={`opt-${t.id}-${idx}`} value={t.id}>
                      {t.name} ({t.latitude.toFixed(3)}, {t.longitude.toFixed(3)})
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 11, color: "#8b949e" }}>
                  Route will start at this source point and visit all other target locations.
                </div>
              </div>
            )}

            {/* ======= SECTION 2: Mission Optimization Metrics ======= */}
            {optimalRoute && (
              <div style={{ background: "#161b22", padding: 12, borderRadius: 8, border: "1px solid #30363d", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#58a6ff", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                  Mission Optimization Metrics
                </div>

                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Total Distance</span>
                  <span style={styles.metricValue}>
                    {optimalRoute.total_distance_km} km ({optimalRoute.total_distance_nautical_miles} NM)
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Est. Transit Duration</span>
                  <span style={styles.metricValue}>{optimalRoute.estimated_time_hours} hrs @ 12 kts</span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Est. Fuel Burn</span>
                  <span style={styles.metricValue}>{optimalRoute.estimated_fuel_liters} L</span>
                </div>

                {/* Waypoint Trajectory List */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
                    Waypoint Sequence ({optimalRoute.waypoints.length})
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                    {optimalRoute.waypoints.map((wp, idx) => (
                      <div
                        key={`wp-seq-${wp.id}-${idx}`}
                        onClick={() => setSelectedWaypoint({ lat: wp.latitude, lng: wp.longitude, objectName: wp.name, step_number: wp.step_number, id: wp.id })}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 4,
                          background: wp.is_return ? "#161b22" : wp.is_origin ? "#1c2128" : "#0d1117",
                          borderLeft: wp.is_return ? "3px solid #8b949e" : wp.is_origin ? "3px solid #238636" : "3px solid #1f6feb",
                          fontSize: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          color: wp.is_return ? "#8b949e" : wp.is_origin ? "#3fb950" : "#e6edf3",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                          #{wp.step_number} {wp.is_return ? `↩ Return to Origin` : wp.name}
                        </span>
                        <span style={{ fontFamily: "monospace", color: "#8b949e", fontSize: 11 }}>
                          {wp.latitude.toFixed(3)}, {wp.longitude.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======= SECTION 3: Selected Waypoint Card ======= */}
            {selectedWaypoint && (
              <div style={{ background: "#161b22", padding: 12, borderRadius: 8, border: "1px solid #388bfd" }}>
                <div style={{ fontSize: 11, color: "#58a6ff", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                  Selected Waypoint
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e6edf3", marginBottom: 4 }}>
                  {selectedWaypoint.objectName || selectedWaypoint.label || "Waypoint"}
                </div>
                <div style={{ fontSize: 12, color: "#8b949e", fontFamily: "monospace" }}>
                  Lat: {selectedWaypoint.lat?.toFixed(5)}, Lng: {selectedWaypoint.lng?.toFixed(5)}
                </div>
                {rawTargets.length > 0 && selectedWaypoint.id && String(selectedWaypoint.id) !== String(selectedSourceId) && (
                  <button
                    onClick={() => {
                      setSelectedSourceId(selectedWaypoint.id);
                      computeRoute(selectedWaypoint.id, rawTargets);
                    }}
                    style={{
                      marginTop: 8,
                      width: "100%",
                      padding: "6px",
                      background: "#1f6feb",
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📍 Set as Source Location
                  </button>
                )}
              </div>
            )}

            {/* ======= SECTION 4: Initial Empty State Guidance ======= */}
            {rawTargets.length === 0 && !loading && (
              <div style={{ background: "#161b22", padding: 16, borderRadius: 8, border: "1px dashed #30363d", textAlign: "center", color: "#8b949e" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#c9d1d9", marginBottom: 4 }}>No CSV Data Loaded</div>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                  Upload a debris CSV file using the <strong>Upload Debris CSV</strong> button above to select your source location and plan the optimal route.
                </div>
              </div>
            )}
          </SidePanel>
        </div>
      </div>
    </div>
  );
}

const styles = {
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #21262d",
  },
  metricLabel: {
    fontSize: 12,
    color: "#8b949e",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "#e6edf3",
  },
};
