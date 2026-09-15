import React, { useCallback, useEffect, useMemo, useState } from "react";
import MapComponent from "./MapComponent";
import SidePanel from "./SidePanel";
import "./MapPage.css";
import { normalizeDetectionPoints, normalizeGeneratedPositions } from "../utils/mapPoints";

export default function MapPage({ apiBaseUrl, detectionPoints }) {
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [routeData, setRouteData] = useState([]);
  const [loadError, setLoadError] = useState("");
  // Two exclusive views:
  //   - detections present -> show ONLY the objects found in the uploaded image
  //   - otherwise          -> show no generated dataset points
  const isDetectionView = normalizeDetectionPoints(detectionPoints).length > 0;

  const mappedPoints = useMemo(() => {
    if (isDetectionView) {
      return normalizeDetectionPoints(detectionPoints);
    }
    return normalizeGeneratedPositions(routeData);
  }, [routeData, detectionPoints, isDetectionView]);

  const detectedObjects = useMemo(
    () => normalizeDetectionPoints(detectionPoints),
    [detectionPoints],
  );

  const handleMapClick = useCallback((coords) => {
    setSelectedDetection(null);
    setClickedCoords(coords);
  }, []);

  const handlePointClick = useCallback((point) => {
    setSelectedDetection(point);
    setClickedCoords({ lat: point.lat, lng: point.lng });
  }, []);

  useEffect(() => {
    if (!clickedCoords) return;

    const controller = new AbortController();
    setPlaceName("Finding place...");

    const fetchPlaceName = async () => {
      try {
        const query = new URLSearchParams({
          format: "jsonv2",
          lat: clickedCoords.lat,
          lon: clickedCoords.lng,
          zoom: "18",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?${query}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setPlaceName(data.display_name || "Place name unavailable");
      } catch (err) {
        if (err.name !== "AbortError") {
          setPlaceName("Place name unavailable");
        }
      }
    };

    fetchPlaceName();

    return () => controller.abort();
  }, [clickedCoords]);

  return (
    <div className="map-page-container">
      <div className="map-container">
        <MapComponent
          routeData={mappedPoints}
          pathColor="#FF5722"
          showMarkers={true}
          onMapClick={handleMapClick}
          onPointClick={handlePointClick}
          onLocationFound={(loc) => setUserLocation(loc)}
        />
      </div>

      <div className="side-panel-container">
        <SidePanel
          coordinates={clickedCoords}
          detection={selectedDetection}
          detections={detectedObjects}
          placeName={placeName}
          userLocation={userLocation}
          routeInfo={{
            waypoints: mappedPoints.length,
          }}
        />
      </div>
    </div>
  );
}
