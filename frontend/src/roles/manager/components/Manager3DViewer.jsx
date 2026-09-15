import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

function OceanSeabedMesh({ depth = 20 }) {
  const seabedY = -depth;
  return (
    <group position={[0, seabedY, 0]}>
      {/* Seabed floor mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120, 32, 32]} />
        <meshStandardMaterial
          color="#1e3a5f"
          wireframe={false}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Seabed Bathymetric Grid */}
      <gridHelper args={[120, 24, "#38bdf8", "#0369a1"]} position={[0, 0.05, 0]} />
    </group>
  );
}

function Object3DBox({ detection }) {
  const dims = detection?.dimensions || { width: 3.5, length: 5.2, height: 1.8 };
  const posX = detection?.local_x || 4.2;
  const posY = -(detection?.depth || 15) + dims.height / 2;
  const posZ = detection?.local_z || 12.8;

  return (
    <group position={[posX, posY, posZ]}>
      {/* Object Solid Mesh */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dims.width, dims.height, dims.length]} />
        <meshStandardMaterial
          color={detection?.priority === "High Priority" ? "#ef4444" : "#0284c7"}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Wireframe Bounding Box */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(dims.width, dims.height, dims.length)]} />
        <lineBasicMaterial color="#38bdf8" linewidth={2} />
      </lineSegments>

      {/* Label above object */}
      <Text
        position={[0, dims.height / 2 + 1.2, 0]}
        fontSize={1.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`${detection?.name || "Detected Object"} (${dims.width}m × ${dims.length}m)`}
      </Text>
    </group>
  );
}

function SpatialVectors({ detection }) {
  const targetX = detection?.local_x || 4.2;
  const targetY = -(detection?.depth || 15);
  const targetZ = detection?.local_z || 12.8;

  const points = [
    [0, 0, 0], // Surface Vessel origin
    [targetX, 0, targetZ], // Surface projected point
    [targetX, targetY, targetZ], // Target seabed position
  ];

  return (
    <group>
      {/* Vessel Surface Marker */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>

      <Text position={[0, 2.5, 0]} fontSize={1.2} color="#f59e0b">
        Surface Vessel Origin
      </Text>

      {/* Spatial Vector Lines */}
      <Line points={points} color="#eab308" lineWidth={2} dashSize={1} gapSize={0.5} />

      {/* Vertical Depth Vector */}
      <Line
        points={[
          [targetX, 0, targetZ],
          [targetX, targetY, targetZ],
        ]}
        color="#ef4444"
        lineWidth={3}
      />
    </group>
  );
}

export default function Manager3DViewer({ detection, onClose }) {
  const det = detection || {
    name: "Ghost Fishing Net Cluster",
    survey_id: "SRV-2026-001",
    latitude: 18.9500,
    longitude: 72.8000,
    depth: 14.5,
    local_x: 4.2,
    local_z: 12.8,
    dimensions: { width: 3.5, length: 5.2, height: 1.8 },
    priority: "High Priority",
    status: "Pending Review",
    assigned_operator: "Unassigned",
  };

  const dims = det.dimensions || { width: 3.5, length: 5.2, height: 1.8 };
  const estimatedVolume = (dims.width * dims.length * dims.height).toFixed(2);
  const slantRange = Math.sqrt(
    Math.pow(det.local_x || 0, 2) + Math.pow(det.depth || 0, 2) + Math.pow(det.local_z || 0, 2)
  ).toFixed(2);

  return (
    <div className="manager-3d-inspector-page">
      <div className="inspector-header">
        <div className="header-left">
          <span className="survey-badge">{det.survey_id}</span>
          <h2>3D Object Inspector: {det.name}</h2>
        </div>
        {onClose && (
          <button type="button" className="btn-close-3d" onClick={onClose}>
            &times; Close 3D View
          </button>
        )}
      </div>

      <div className="inspector-content-grid">
        {/* 3D Canvas View */}
        <div className="canvas-wrapper">
          <Canvas camera={{ position: [20, 15, 25], fov: 50 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[20, 30, 20]} intensity={1.2} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#38bdf8" />

            <OceanSeabedMesh depth={det.depth || 15} />
            <Object3DBox detection={det} />
            <SpatialVectors detection={det} />

            <OrbitControls makeDefault enablePan={true} maxPolarAngle={Math.PI / 2 + 0.1} />
          </Canvas>

          <div className="canvas-overlay-legend">
            <span>🔴 High Priority Anomaly Box</span>
            <span>🟡 Spatial Projection Vector</span>
            <span>🔵 Seabed Bathymetric Grid</span>
          </div>
        </div>

        {/* Object Specs & Spatial Relationships Panel */}
        <aside className="telemetry-sidebar">
          <h3>Object Telemetry & Spatial Specs</h3>

          <div className="telemetry-group">
            <h4>1. Object Position</h4>
            <div className="telemetry-row">
              <span>Latitude:</span>
              <strong>{det.latitude ? det.latitude.toFixed(5) : "18.95000"} N</strong>
            </div>
            <div className="telemetry-row">
              <span>Longitude:</span>
              <strong>{det.longitude ? det.longitude.toFixed(5) : "72.80000"} E</strong>
            </div>
            <div className="telemetry-row">
              <span>Seabed Depth:</span>
              <strong>{det.depth} meters</strong>
            </div>
          </div>

          <div className="telemetry-group">
            <h4>2. Object Dimensions</h4>
            <div className="telemetry-row">
              <span>Width:</span>
              <strong>{dims.width} m</strong>
            </div>
            <div className="telemetry-row">
              <span>Length:</span>
              <strong>{dims.length} m</strong>
            </div>
            <div className="telemetry-row">
              <span>Height:</span>
              <strong>{dims.height} m</strong>
            </div>
            <div className="telemetry-row">
              <span>Est. Spatial Volume:</span>
              <strong>{estimatedVolume} m³</strong>
            </div>
          </div>

          <div className="telemetry-group">
            <h4>3. Surrounding Seabed & Offset</h4>
            <div className="telemetry-row">
              <span>Local X Offset:</span>
              <strong>{det.local_x} m</strong>
            </div>
            <div className="telemetry-row">
              <span>Local Z Offset:</span>
              <strong>{det.local_z} m</strong>
            </div>
            <div className="telemetry-row">
              <span>Slant Range to Vessel:</span>
              <strong>{slantRange} m</strong>
            </div>
          </div>

          <div className="telemetry-group">
            <h4>4. Operational Status</h4>
            <div className="telemetry-row">
              <span>Priority:</span>
              <strong style={{ color: det.priority === "High Priority" ? "#ef4444" : "#38bdf8" }}>
                {det.priority || "Normal"}
              </strong>
            </div>
            <div className="telemetry-row">
              <span>Status:</span>
              <strong>{det.status}</strong>
            </div>
            <div className="telemetry-row">
              <span>Assigned Operator:</span>
              <strong>{det.assigned_operator || "Unassigned"}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
