/**
 * SidePanel.jsx
 * 
 * Right-side panel for the Debris Detector map page.
 * Displays clicked coordinates, place name, route info,
 * and future debris detection results.
 * 
 * Usage (inside an 80-20 layout):
 *   <div style={{ display: 'flex', width: '100%', height: '100vh' }}>
 *     <div style={{ flex: 4 }}><MapComponent ... /></div>
 *     <div style={{ flex: 1 }}><SidePanel ... /></div>
 *   </div>
 */

import React, { useState } from "react";

export default function SidePanel({
  coordinates = null,       // { lat, lng } from map click
  detection = null,         // selected detected object from a marker click
  detections = [],          // all detected objects for the object list
  placeName = "",            // reverse-geocoded name
  routeInfo = null,           // { waypoints: number, distance?: string }
  userLocation = null,        // { lat, lng } from GPS
  optimalRoute = null,        // Greedy + 2-Opt route object
  onToggleOptimalRoute = null, // callback to fetch/clear optimal route
  loadingRoute = false,       // loading spinner indicator
  showEmptyPlaceholders = true, // set to false to hide empty placeholder sections
  children,                   // slot for extra content
  className = "",
  style = {},
}) {
  /* ---- tiny helpers ---- */
  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedLabel(text);
    setTimeout(() => setCopiedLabel(null), 1500);
  };
  const [copiedLabel, setCopiedLabel] = useState(null);

  return (
    <div
      className={`side-panel ${className}`}
      style={{
        width: "100%",
        minWidth: 240,
        height: "100%",
        background: "linear-gradient(180deg, #0d1117 0%, #161b22 100%)",
        borderLeft: "1px solid #21262d",
        color: "#e6edf3",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ---- Header ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 12px",
          borderBottom: "1px solid #21262d",
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#e6edf3",
          }}
        >
          Map Info & Optimization
        </h2>
      </div>

      {/* ---- Scrollable Content ---- */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >

          {/* ======= SECTION: Coordinates ======= */}
          {(coordinates || showEmptyPlaceholders) && (
            <Section title="Coordinates" icon="pin">
              {coordinates ? (
                <>
                  <CoordRow
                    label="Latitude"
                    value={coordinates.lat.toFixed(6)}
                    onCopy={() => copyToClipboard(coordinates.lat.toFixed(6))}
                    copied={copiedLabel === coordinates.lat.toFixed(6)}
                  />
                  <CoordRow
                    label="Longitude"
                    value={coordinates.lng.toFixed(6)}
                    onCopy={() => copyToClipboard(coordinates.lng.toFixed(6))}
                    copied={copiedLabel === coordinates.lng.toFixed(6)}
                  />
                </>
              ) : (
                <p style={styles.emptyText}>
                  Click on the map to get coordinates
                </p>
              )}
            </Section>
          )}

          {detections.length > 0 && (
            <Section title={`Detected Objects (${detections.length})`} icon="target">
              <div style={styles.detectionList}>
                {detections.map((object, index) => (
                  <div key={`${object.objectName || "object"}-${object.lat}-${object.lng}-${index}`} style={styles.detectionListItem}>
                    <div style={styles.detectionListHeader}>
                      <strong style={styles.detectionListName}>{object.objectName || `Object ${index + 1}`}</strong>
                      <span style={styles.detectionListConfidence}>
                        {(Number(object.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={styles.detectionListCoordinates}>
                      <span>Lat: {Number(object.lat).toFixed(6)}</span>
                      <span>Lng: {Number(object.lng).toFixed(6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ======= SECTION: Location Name ======= */}
          {(placeName || showEmptyPlaceholders) && (
            <Section title="Location" icon="map">
              {placeName && placeName !== "Finding place..." ? (
                <p style={{ margin: 0, fontSize: 13, color: "#c9d1d9", lineHeight: 1.5 }}>
                  {placeName}
                </p>
              ) : placeName === "Finding place..." ? (
                <div style={styles.loadingRow}>
                  <div style={styles.spinner} />
                  <span>Finding place...</span>
                </div>
              ) : (
                <p style={styles.emptyText}>
                  Click on the map to see location name
                </p>
              )}
            </Section>
          )}

          {/* ======= SECTION: User Location (GPS) ======= */}
          {userLocation && (
            <Section title="Your Location" icon="user">
              <CoordRow
                label="Lat"
                value={userLocation.lat.toFixed(6)}
                onCopy={() => copyToClipboard(userLocation.lat.toFixed(6))}
                copied={copiedLabel === userLocation.lat.toFixed(6)}
              />
              <CoordRow
                label="Lng"
                value={userLocation.lng.toFixed(6)}
                onCopy={() => copyToClipboard(userLocation.lng.toFixed(6))}
                copied={copiedLabel === userLocation.lng.toFixed(6)}
              />
            </Section>
          )}

          {/* ======= SECTION: Route Info ======= */}
          {routeInfo && routeInfo.waypoints >= 2 && !optimalRoute && (
            <Section title="Route" icon="route">
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Waypoints</span>
                <span style={styles.statValue}>{routeInfo.waypoints}</span>
              </div>
              {routeInfo.distance && (
                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Distance</span>
                  <span style={styles.statValue}>{routeInfo.distance}</span>
                </div>
              )}
              {routeInfo.downloadUrl && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = routeInfo.downloadUrl;
                  }}
                  style={styles.downloadButton}
                >
                  Download JSON
                </button>
              )}
            </Section>
          )}

          {/* ======= SLOT: extra content from parent ======= */}
          {children}
      </div>
    </div>
  );
}

/* ================================================================
 *   Sub-components (kept in the same file)
 * ================================================================ */

function Section({ title, icon, children }) {
  const icons = {
    pin: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    map: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    user: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      </svg>
    ),
    route: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 12 8 12 12 4 16 20 20 12 21 12" />
      </svg>
    ),
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {icons[icon] || icons.pin}
        <h3
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#8b949e",
          }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function CoordRow({ label, value, onCopy, copied }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #21262d",
      }}
    >
      <div>
        <span style={{ fontSize: 11, color: "#8b949e", marginRight: 8 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
          {value}
        </span>
      </div>
      <button
        onClick={onCopy}
        title="Copy"
        style={{
          background: "none",
          border: "1px solid #30363d",
          borderRadius: 4,
          color: copied ? "#3fb950" : "#8b949e",
          cursor: "pointer",
          padding: "2px 6px",
          fontSize: 11,
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.color = "#e6edf3";
            e.currentTarget.style.borderColor = "#8b949e";
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.color = "#8b949e";
            e.currentTarget.style.borderColor = "#30363d";
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/* ================================================================
 *   Inline styles
 * ================================================================ */
const styles = {
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: "#484f58",
    fontStyle: "italic",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#8b949e",
  },
  spinner: {
    width: 14,
    height: 14,
    border: "2px solid #30363d",
    borderTopColor: "#4285F4",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  detectionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  detectionListItem: {
    padding: "9px 10px",
    border: "1px solid #21262d",
    borderRadius: 6,
    background: "rgba(255, 255, 255, 0.025)",
  },
  detectionListHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detectionListName: {
    minWidth: 0,
    overflow: "hidden",
    color: "#e6edf3",
    fontSize: 13,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  detectionListConfidence: {
    flexShrink: 0,
    color: "#ffd166",
    fontSize: 11,
    fontWeight: 700,
  },
  detectionListCoordinates: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginTop: 5,
    color: "#8b949e",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: 11,
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #21262d",
  },
  statLabel: {
    fontSize: 13,
    color: "#8b949e",
  },
  statValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e6edf3",
  },
  downloadButton: {
    width: "100%",
    height: 36,
    marginTop: 12,
    border: "1px solid #238636",
    borderRadius: 6,
    background: "#238636",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
};
