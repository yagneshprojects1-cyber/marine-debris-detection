import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import DetectionMarker from "../components/threeD/DetectionMarker";
import { ROVModel } from "../components/ModelLoader";
import Terrain from "../components/threeD/Terrain";

function DetectionDetails({ selectedObj, onClose }) {
  if (!selectedObj) return null;

  return (
    <div className="three-d-details">
      <div className="three-d-details-header">
        <div>
          <span className="three-d-details-eyebrow">Detected object</span>
          <h3>{selectedObj.detection.name || "Unknown"}</h3>
        </div>
        <button type="button" className="three-d-details-close" onClick={onClose} aria-label="Close object details">
          ×
        </button>
      </div>
      <div className="three-d-details-confidence">
        <span>Confidence</span>
        <strong>{((selectedObj.detection.confidence || 0) * 100).toFixed(1)}%</strong>
      </div>
      <div className="three-d-details-grid">
        <div className="three-d-detail-row">
          <span>Depth</span>
          <strong>{selectedObj.geoInfo.depth.toFixed(1)} m</strong>
        </div>
        <div className="three-d-detail-row">
          <span>Latitude</span>
          <strong>{selectedObj.geoInfo.latitude}</strong>
        </div>
        <div className="three-d-detail-row">
          <span>Longitude</span>
          <strong>{selectedObj.geoInfo.longitude}</strong>
        </div>
      </div>
    </div>
  );
}

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

export default function ThreeDMapPage({ detections = [], shipLatitude, shipLongitude }) {
  const [selectedObj, setSelectedObj] = useState(null);
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

  return (
    <div className="three-d-page">
      <Canvas camera={{ position: [0, 45, 105], fov: 52 }}>
        <fog attach="fog" args={["#042b44", 120, 430]} />
        <ambientLight intensity={0.4} color="#aaccff" />
        <hemisphereLight skyColor="#ffffff" groundColor="#000033" intensity={0.6} />
        <directionalLight position={[100, 100, 50]} intensity={0.8} castShadow />
        <OceanSurface />
        <mesh position={[0, seabedY, 0]}>
          <boxGeometry args={[500, seabedThickness, 500]} />
          <meshStandardMaterial color="#081b27" roughness={1} />
        </mesh>
        <Terrain anchorX={anchorX} anchorZ={anchorZ} depth={seabedDepth} />
        <group position={rovPosition}>
          <ROVModel scale={1.25} />
          <Text position={[16, 20, 0]} fontSize={4} color="#ffd166" anchorX="left" anchorY="middle" outlineWidth={0.2} outlineColor="#06283d">
            ROV
          </Text>
          <Text position={[16, 14, 0]} fontSize={2.2} color="#d9f7ff" anchorX="left" anchorY="middle" outlineWidth={0.12} outlineColor="#06283d" lineHeight={1.2}>
            {Number.isFinite(Number(shipLatitude)) && Number.isFinite(Number(shipLongitude))
              ? `Lat: ${shipLatitude}\nLon: ${shipLongitude}`
              : "Lat: unavailable\nLon: unavailable"}
          </Text>
        </group>

        {primaryDetections.map((detection, index) => (
          <DetectionMarker
            key={`${detection.name || "object"}-${index}`}
            detection={detection}
            seabedDepth={seabedDepth}
            anchorX={anchorX}
            anchorZ={anchorZ}
            rovPosition={rovPosition}
            onClick={(object, geoInfo) => setSelectedObj({ detection: object, geoInfo })}
          />
        ))}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={220}
          target={[0, -seabedDepth, 0]}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
      <DetectionDetails selectedObj={selectedObj} onClose={() => setSelectedObj(null)} />
      <div className="three-d-visualization-note" role="note">
        3D visualization for reference only. This is a visual representation, not a physical or geographic measurement.
      </div>
    </div>
  );
}
