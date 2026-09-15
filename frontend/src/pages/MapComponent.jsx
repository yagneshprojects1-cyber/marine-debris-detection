/**
 * MapComponent.jsx
 * 
 * Leaflet satellite map with route drawing, numbered markers,
 * arrow decorations, and GPS location button.
 * 
 * All click/location data is sent UP to the parent via callbacks —
 * no overlays or reverse-geocoding inside this component.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet-polylinedecorator";
import "leaflet/dist/leaflet.css";
import "./MapComponent.css";

// Fix default marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom blue dot icon for user location
const userIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="width:24px;height:24px;border-radius:50%;background:rgba(66,133,244,0.2);position:absolute;top:0;left:0;"></div>
      <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;position:absolute;top:5px;left:5px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const createDotIcon = (color = "#e11d48", size = 10, label = "") =>
  new L.DivIcon({
    className: "",
    html: label
      ? `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:sans-serif;">${label}</div>`
      : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.45);"></div>`,
    iconSize: label ? [24, 24] : [size + 4, size + 4],
    iconAnchor: label ? [12, 12] : [(size + 4) / 2, (size + 4) / 2],
  });

const mapViews = {
  satellite: {
    label: "Satellite",
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.arcgisonline.com/">ArcGIS</a>',
  },
};

const MapComponent = ({
  center = [12.9716, 77.5946],
  zoom = 8,
  onLocationFound,
  onMapClick,
  onPointClick,
  tileUrl = mapViews.satellite.tileUrl,
  attribution = mapViews.satellite.attribution,
  routeData = [],
  pathColor = "#4285F4",
  pathWeight = 4,
  pathOpacity = 0.9,
  showMarkers = true,
  fitRouteBounds = true,
  overviewZoom = 4,
  markerZoom = 10,
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeLayerGroupRef = useRef(null);
  const markerFocusRef = useRef({ key: null, zoomed: false });
  const [locating, setLocating] = useState(false);
  const [locationVisible, setLocationVisible] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    tileLayerRef.current = L.tileLayer(tileUrl || mapViews.satellite.tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    const handleMapClick = (event) => {
      if (onMapClick) {
        onMapClick({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        });
      }
    };

    mapInstanceRef.current.on("click", handleMapClick);

    return () => {
      mapInstanceRef.current?.off("click", handleMapClick);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw route path when routeData changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routeLayerGroupRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerGroupRef.current);
      routeLayerGroupRef.current = null;
    }

    if (!routeData || routeData.length === 0) return;

    const group = L.layerGroup();
    const latLngs = routeData.map((point) => [point.lat, point.lng]);

    // Polyline (with arrows) only makes sense once we have at least 2 points.
    let polyline = null;
    if (routeData.length >= 2) {
      polyline = L.polyline(latLngs, {
        color: pathColor,
        weight: pathWeight,
        opacity: pathOpacity,
        smoothFactor: 1,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(group);

      if (L.polylineDecorator && L.Symbol?.arrowHead) {
        const decorator = L.polylineDecorator(polyline, {
          patterns: [
            {
              offset: "30px",
              repeat: "60px",
              symbol: L.Symbol.arrowHead({
                pixelSize: 12,
                headAngle: 60,
                pathOptions: {
                  color: "#ffffff",
                  fillColor: "#388bfd",
                  fillOpacity: 1,
                  weight: 1.5,
                  stroke: true,
                },
              }),
            },
          ],
        });
        decorator.addTo(group);
      }
    }

    if (showMarkers) {
      routeData.forEach((point, index) => {
        // Do not place a duplicate marker icon over #1 if the final waypoint is the return to origin
        if (
          index > 0 &&
          index === routeData.length - 1 &&
          Math.abs(point.lat - routeData[0].lat) < 1e-5 &&
          Math.abs(point.lng - routeData[0].lng) < 1e-5
        ) {
          return;
        }

        const isStart = index === 0;
        const isEnd = index === routeData.length - 1;
        const markerColor = isStart ? "#16a34a" : isEnd ? "#2563eb" : "#dc2626";
        const markerSize = isStart ? 14 : 10;
        const stepLabel = point.step_number ? String(point.step_number) : String(index + 1);
        const marker = L.marker([point.lat, point.lng], {
          icon: createDotIcon(markerColor, markerSize, stepLabel),
        });
        const markerKey = `${point.lat}:${point.lng}:${index}`;

        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);

          const map = mapInstanceRef.current;
          const isSameMarker = markerFocusRef.current.key === markerKey;
          const shouldZoomOut = isSameMarker && markerFocusRef.current.zoomed;

          if (map) {
            if (shouldZoomOut) {
              const latLngs = routeData.map((routePoint) => [routePoint.lat, routePoint.lng]);
              const bounds = L.latLngBounds(latLngs);
              const samePoint = bounds.getSouthWest().equals(bounds.getNorthEast());

              if (samePoint) {
                map.flyTo([point.lat, point.lng], overviewZoom, { duration: 2 });
              } else {
                map.flyToBounds(bounds, {
                  padding: [40, 40],
                  maxZoom: overviewZoom,
                  duration: 2,
                });
              }

              markerFocusRef.current = { key: markerKey, zoomed: false };
            } else {
              map.flyTo([point.lat, point.lng], markerZoom, { duration: 2 });
              markerFocusRef.current = { key: markerKey, zoomed: true };
            }
          }

          if (onPointClick) {
            onPointClick(point);
          }
        });

        marker.addTo(group);
      });
    }

    group.addTo(mapInstanceRef.current);
    routeLayerGroupRef.current = group;

    if (fitRouteBounds) {
      if (polyline) {
        // Multi-point route: fit to polyline bounds.
        mapInstanceRef.current.fitBounds(polyline.getBounds(), {
          padding: [40, 40],
        });
      } else if (latLngs.length === 1) {
        // Single unique point: center with a fixed zoom.
          mapInstanceRef.current.setView(latLngs[0], overviewZoom);
      } else {
        // Multiple points that may be identical (zero-area bounds).
        const bounds = L.latLngBounds(latLngs);
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        if (sw.lat === ne.lat && sw.lng === ne.lng) {
          mapInstanceRef.current.setView([sw.lat, sw.lng], overviewZoom);
        } else {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: overviewZoom,
          });
        }
      }
    }
  }, [
    routeData,
    pathColor,
    pathWeight,
    pathOpacity,
    showMarkers,
    fitRouteBounds,
    overviewZoom,
    markerZoom,
    onPointClick,
  ]);

  // Navigate to user's current location
  const goToMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    if (locationVisible) {
      if (mapInstanceRef.current && userMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
      }
      userMarkerRef.current = null;
      setLocationVisible(false);
      onLocationFound?.(null);
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = [latitude, longitude];

        if (mapInstanceRef.current) {
          if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
          }

          userMarkerRef.current = L.marker(userLocation, {
            icon: userIcon,
          }).addTo(mapInstanceRef.current);
          setLocationVisible(true);

          if (onLocationFound) {
            onLocationFound({ lat: latitude, lng: longitude });
          }
        }

        setLocating(false);
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Location access denied. Please enable location permissions.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out. Try again.");
            break;
          default:
            alert("Unknown error fetching location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [locationVisible, onLocationFound]);

  return (
    <div className="map-component">
      {/* Map Container */}
      <div ref={mapContainerRef} className="map-container" />

      {/* Route Info Badge */}
      {routeData && routeData.length >= 2 && (
        <div className="route-info-badge">
          <span style={{ color: pathColor }}>●</span> {routeData.length} waypoints
        </div>
      )}

      {/* My Location Button — Top Right Corner */}
      <button
        onClick={goToMyLocation}
        title={locationVisible ? "Hide My Location" : "Show My Location"}
        aria-label={locationVisible ? "Hide my location" : "Show my location"}
        disabled={locating}
        className="my-location-button"
      >
        {locating ? (
          <svg width="20" height="20" viewBox="0 0 24 24" className="location-loader">
            <circle cx="12" cy="12" r="10" stroke="#999" strokeWidth="2.5" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4" stroke="#666" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="9" stroke="#666" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
            <circle cx="12" cy="12" r="1.5" fill="#4285F4" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MapComponent;
