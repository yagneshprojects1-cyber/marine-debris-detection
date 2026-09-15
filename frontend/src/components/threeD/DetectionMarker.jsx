import { useRef, useState } from "react";
import { Line, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { calculateObjectGeoPosition } from "../../utils/geoUtils";
import { getTerrainY } from "../../utils/terrain";
import DetectionObject3D from "../ModelLoader";

function SonarBeam({ objectPosition, rovPosition }) {
  const materialRef = useRef(null);
  const beamRef = useRef(null);
  const start = new THREE.Vector3(...rovPosition);
  const end = new THREE.Vector3(...objectPosition);
  const direction = end.clone().sub(start);
  const length = Math.max(1, direction.length());
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const beamQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize().negate()
  );
  const radius = Math.min(7, Math.max(2.5, length * 0.12));

  useFrame(({ clock }) => {
    const pulse = 0.82 + Math.sin(clock.getElapsedTime() * 3.2) * 0.18;
    if (beamRef.current) {
      beamRef.current.scale.set(pulse, 1, pulse);
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.08 + pulse * 0.1;
    }
  });

  return (
    <mesh ref={beamRef} position={midpoint} quaternion={beamQuaternion}>
      <coneGeometry args={[radius, length, 32, 1, true]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#73e6ff"
        transparent
        opacity={0.16}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function DepthGuide({ depth, objectPosition, rovPosition }) {
  const start = new THREE.Vector3(...rovPosition);
  const end = new THREE.Vector3(...objectPosition);
  const direction = end.clone().sub(start);
  const lineLength = Math.max(1, direction.length());
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const horizontalDirection = new THREE.Vector3(direction.x, 0, direction.z);
  const horizontalLength = horizontalDirection.length();
  const angleRadians = Math.atan2(Math.abs(direction.y), horizontalLength);
  const angleDegrees = THREE.MathUtils.radToDeg(angleRadians);
  const verticalSign = direction.y >= 0 ? 1 : -1;
  const arcRadius = Math.min(4.5, Math.max(2.5, lineLength * 0.18));
  const horizontalUnit = horizontalLength > 0
    ? horizontalDirection.normalize()
    : new THREE.Vector3(1, 0, 0);
  const arcPoints = Array.from({ length: 17 }, (_, index) => {
    const arcAngle = angleRadians * (index / 16);
    return [
      start.x + horizontalUnit.x * arcRadius * Math.cos(arcAngle),
      start.y + verticalSign * arcRadius * Math.sin(arcAngle),
      start.z + horizontalUnit.z * arcRadius * Math.cos(arcAngle),
    ];
  });
  const angleLabelAngle = angleRadians / 2;
  const angleLabelPosition = [
    start.x + horizontalUnit.x * (arcRadius + 1.2) * Math.cos(angleLabelAngle),
    start.y + verticalSign * (arcRadius + 1.2) * Math.sin(angleLabelAngle),
    start.z + horizontalUnit.z * (arcRadius + 1.2) * Math.cos(angleLabelAngle),
  ];
  const lineUnit = direction.clone().normalize();
  const labelOffset = new THREE.Vector3(-lineUnit.y, lineUnit.x, 0);
  if (labelOffset.lengthSq() < 0.01) {
    labelOffset.set(1, 0, 0);
  } else {
    labelOffset.normalize();
  }
  const depthLabelPosition = midpoint.clone().add(labelOffset.multiplyScalar(3.2));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );

  return (
    <group>
      <Line points={arcPoints} color="#ffd166" lineWidth={1.5} depthTest={false} />
      <Text
        position={angleLabelPosition}
        fontSize={2.2}
        color="#ffd166"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#06283d"
        depthOffset={-1}
      >
        {`${angleDegrees.toFixed(1)}°`}
      </Text>
      <mesh position={midpoint} quaternion={quaternion}>
        <cylinderGeometry args={[0.08, 0.08, lineLength, 8]} />
        <meshBasicMaterial color="#73e6ff" transparent opacity={0.85} depthTest={false} />
      </mesh>
      <Text
        position={depthLabelPosition}
        fontSize={2.8}
        color="#b9f5ff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.12}
        outlineColor="#06283d"
        depthOffset={-1}
      >
        {`${depth.toFixed(1)} m`}
      </Text>
    </group>
  );
}

export default function DetectionMarker({ detection, seabedDepth = 40, anchorX = 0, anchorZ = 0, rovPosition = [-18, -20, 0], isSelected = false, onClick }) {
  const [hovered, setHovered] = useState(false);
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
  const displayX = geoInfo.x;
  const displayZ = geoInfo.z;
  const objectY = getTerrainY(displayX, displayZ, anchorX, anchorZ, seabedDepth);
  const measurementDepth = geoInfo.depth;
  const position = [displayX, objectY, displayZ];

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick(detection, geoInfo);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
    >
      <group>
        <DetectionObject3D detection={detection} scale={1} showLabel={false} />
      </group>
      <DepthGuide
        depth={measurementDepth}
        objectPosition={[0, 0, 0]}
        rovPosition={[
          rovPosition[0] - displayX,
          rovPosition[1] - objectY,
          rovPosition[2] - displayZ,
        ]}
      />
      <SonarBeam
        objectPosition={[0, 0, 0]}
        rovPosition={[
          rovPosition[0] - displayX,
          rovPosition[1] - objectY,
          rovPosition[2] - displayZ,
        ]}
      />
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.3, 0, 4, 8]} />
        <meshStandardMaterial color={hovered ? "#ffaa00" : "#ffffff"} />
      </mesh>
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 20, 8]} />
        <meshBasicMaterial color="#ffcf70" transparent opacity={0.8} depthTest={false} />
      </mesh>
      {isSelected && (
        <Text
          position={[0, 21, 0]}
          fontSize={2.2}
          color="#b98b2a"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.12}
          outlineColor="#06283d"
          depthOffset={-1}
          lineHeight={1.2}
        >
          {`Lat: ${detection.latitude}\nLon: ${detection.longitude}`}
        </Text>
      )}
      <mesh position={[12, 12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 24, 8]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>

      {isSelected && (
        <Text position={[24, 12, 0]} fontSize={5.5} color="#ffd166" anchorX="left" anchorY="middle" outlineWidth={0.35} outlineColor="#06283d" maxWidth={48}>
          {detection.name || "Object"}
        </Text>
      )}
    </group>
  );
}