import React, { useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import DetectionMarker from "../components/threeD/DetectionMarker";
import { ROVModel } from "../components/ModelLoader";
import Terrain from "../components/threeD/Terrain";
import { calculateObjectGeoPosition } from "../utils/geoUtils";

function OceanSurface() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[500, 500, 40, 40]} />
        <meshPhysicalMaterial
          color="#087f9b"
          transparent
          opacity={0.22}
          roughness={0.08}
          metalness={0.1}
          transmission={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <gridHelper args={[500, 40, "#55d9e8", "#155d79"]} position={[0, -0.15, 0]} material-opacity={0.18} material-transparent />
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[500, 1, 500]} />
        <meshBasicMaterial color="#006b86" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CameraCompass({ targetPoint, onHeadingChange }) {
  const { camera } = useThree();

  useFrame(() => {
    const direction = targetPoint.clone().sub(camera.position);
    const yaw = Math.atan2(direction.x, direction.z);
    onHeadingChange((yaw * 180) / Math.PI);
  });

  return null;
}

function CompassOverlay({ heading }) {
  return (
    <div className="three-d-compass" aria-label="Compass direction">
      <div className="three-d-compass-ring" style={{ transform: `rotate(${-heading}deg)` }}>
        <span className="three-d-compass-label north">N</span>
        <span className="three-d-compass-label east">E</span>
        <span className="three-d-compass-label south">S</span>
        <span className="three-d-compass-label west">W</span>
        <div className="three-d-compass-needle" />
      </div>
    </div>
  );
}

function getDetectionGeoInfo(detection, seabedDepth) {
  const geoInfo = calculateObjectGeoPosition({
    sonarRange: detection.sonar_range,
    sonarAzimuth: detection.sonar_azimuth,
    sonarElevation: detection.sonar_elevation,
    soundSpeed: detection.sonar_soundspeed,
    frequency: detection.sonar_frequency,
    depth: detection.depth,
    localX: detection.local_x,
    localZ: detection.local_z,
    vehicleLatitude: detection.latitude,
    vehicleLongitude: detection.longitude,
  });

  return {
    ...geoInfo,
    depth: Number.isFinite(geoInfo.depth) ? geoInfo.depth : Number(detection.depth || 0),
    x: Number.isFinite(geoInfo.x) ? geoInfo.x : Number(detection.local_x || 0),
    z: Number.isFinite(geoInfo.z) ? geoInfo.z : Number(detection.local_z || 0),
    seabedDepth,
  };
}

export default function ThreeDMapPage({ detections = [], shipLatitude, shipLongitude }) {
  const [selectedObj, setSelectedObj] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [heading, setHeading] = useState(0);
  const validDetections = detections.filter(
    (detection) => detection && detection.confidence != null && detection.confidence !== undefined && Number(detection.confidence) > 0
  );
  const primaryDetection = validDetections.reduce((highest, detection) => {
    if (!highest) return detection;
    return (Number(detection.confidence) || 0) > (Number(highest.confidence) || 0)
      ? detection
      : highest;
  }, null);
  const primaryDetections = primaryDetection ? [primaryDetection] : [];
  const anchorX = primaryDetection ? Number(primaryDetection.local_x) : 0;
  const anchorZ = primaryDetection ? -Number(primaryDetection.local_z) : 0;
  const maxDepth = validDetections.reduce((maxValue, detection) => {
    const depth = Number(detection.depth);
    return Number.isFinite(depth) ? Math.max(maxValue, depth) : maxValue;
  }, 40);
  const seabedDepth = Number.isFinite(maxDepth) ? maxDepth : 40;
  const seabedThickness = Math.max(300, seabedDepth * 3 + 120);
  const seabedY = -(seabedDepth + seabedThickness / 2);
  const rovY = -Math.max(2, seabedDepth * 0.5);
  const rovPosition = [-30, rovY, 0];

  const objectSidebarItems = useMemo(
    () => validDetections.map((detection, index) => ({
      id: detection.id || `${detection.name || "object"}-${index}`,
      detection,
      geoInfo: getDetectionGeoInfo(detection, seabedDepth),
    })),
    [seabedDepth, validDetections],
  );

  const selectedSidebarItem =
    objectSidebarItems.find((item) => item.id === selectedObjectId) ||
    objectSidebarItems[0] ||
    null;

  const activeSelectedObject =
    selectedObj && objectSidebarItems.some((item) => item.detection === selectedObj.detection)
      ? selectedObj
      : selectedSidebarItem
        ? { detection: selectedSidebarItem.detection, geoInfo: selectedSidebarItem.geoInfo }
        : null;

  const activeSelectedItem = activeSelectedObject
    ? objectSidebarItems.find((item) => item.detection === activeSelectedObject.detection) || null
    : null;

  React.useEffect(() => {
    if (!objectSidebarItems.length) {
      setSelectedObj(null);
      setSelectedObjectId(null);
      return;
    }

    const nextSelected = objectSidebarItems.find((item) => item.id === selectedObjectId) || objectSidebarItems[0];
    if (nextSelected && selectedObjectId !== nextSelected.id) {
      setSelectedObjectId(nextSelected.id);
    }
    if (!selectedObj || selectedObj.detection !== nextSelected.detection) {
      setSelectedObj({ detection: nextSelected.detection, geoInfo: nextSelected.geoInfo });
    }
  }, [objectSidebarItems, selectedObj, selectedObjectId]);

  return (
    <div className="three-d-page">
      <div className="three-d-map-area">
        <Canvas camera={{ position: [0, 45, 105], fov: 52 }}>
          <fog attach="fog" args={["#042b44", 120, 430]} />
          <ambientLight intensity={0.4} color="#aaccff" />
          <hemisphereLight skyColor="#ffffff" groundColor="#000033" intensity={0.6} />
          <directionalLight position={[100, 100, 50]} intensity={0.8} castShadow />
          <CameraCompass targetPoint={new THREE.Vector3(0, -seabedDepth, 0)} onHeadingChange={setHeading} />
          <OceanSurface />
          <Terrain anchorX={anchorX} anchorZ={anchorZ} depth={seabedDepth} />
          <group position={rovPosition}>
            <ROVModel scale={1.25} />
            <Text position={[16, 20, 0]} fontSize={4} color="#b98b2a" anchorX="left" anchorY="middle" outlineWidth={0.2} outlineColor="#06283d">
              ROV
            </Text>
            <Text position={[16, 14, 0]} fontSize={2.2} color="#b98b2a" anchorX="left" anchorY="middle" outlineWidth={0.12} outlineColor="#06283d" lineHeight={1.2}>
              {Number.isFinite(Number(shipLatitude)) && Number.isFinite(Number(shipLongitude))
                ? `Lat: ${shipLatitude}\nLon: ${shipLongitude}`
                : "Lat: unavailable\nLon: unavailable"}
            </Text>
          </group>

          {selectedSidebarItem && (
            <DetectionMarker
              key={selectedSidebarItem.id}
              detection={selectedSidebarItem.detection}
              seabedDepth={seabedDepth}
              anchorX={anchorX}
              anchorZ={anchorZ}
              rovPosition={rovPosition}
              isSelected
              onClick={(object, geoInfo) => {
                setSelectedObjectId(selectedSidebarItem.id);
                setSelectedObj({ detection: object, geoInfo });
              }}
            />
          )}
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={220}
            target={[0, -seabedDepth, 0]}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        </Canvas>
        <CompassOverlay heading={heading} />
        <div className="three-d-visualization-note" role="note">
          3D visualization for reference only. This is a visual representation, not a physical or geographic measurement.
        </div>
      </div>
      <aside className="three-d-sidebar" aria-label="Detection list panel">
        <div className="three-d-sidebar-header">
          <h2 className="three-d-sidebar-title">Map Info &amp; Optimization</h2>
          <div className="three-d-sidebar-tabs" role="tablist" aria-label="Detected objects">
            {objectSidebarItems.length === 0 ? (
              <span className="three-d-no-tabs">No objects detected</span>
            ) : (
              objectSidebarItems.map((item, index) => {
                const active = selectedSidebarItem?.id === item.id;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    key={item.id || `${item.detection.name || "object"}-${index}`}
                    className={`three-d-tab${active ? " active" : ""}`}
                    onClick={() => {
                      setSelectedObjectId(item.id);
                      setSelectedObj({ detection: item.detection, geoInfo: item.geoInfo });
                    }}
                  >
                    <span className="three-d-tab-index">{index + 1}</span>
                    <span className="three-d-tab-label">{item.detection.name || `Object ${index + 1}`}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="three-d-sidebar-details">
          {activeSelectedObject ? (
              <>
                <div className="three-d-details-header">
                  <div>
                    <span className="three-d-details-eyebrow">Detected object</span>
                    <h3>{activeSelectedObject.detection.name || "Unknown"}</h3>
                  </div>
                </div>

                <div className="three-d-details-confidence">
                  <span>Confidence</span>
                  <strong>{((activeSelectedObject.detection.confidence || 0) * 100).toFixed(1)}%</strong>
                </div>

                <div className="three-d-details-grid">
                  <div className="three-d-detail-row">
                    <span>Depth</span>
                    <strong>{activeSelectedObject.geoInfo.depth.toFixed(1)} m</strong>
                  </div>
                  <div className="three-d-detail-row">
                    <span>Latitude</span>
                    <strong>{activeSelectedObject.geoInfo.latitude}</strong>
                  </div>
                  <div className="three-d-detail-row">
                    <span>Longitude</span>
                    <strong>{activeSelectedObject.geoInfo.longitude}</strong>
                  </div>
                </div>
              </>
          ) : (
            <div className="three-d-empty-state">Select an object to view details</div>
          )}
        </div>
      </aside>
    </div>
  );
}
