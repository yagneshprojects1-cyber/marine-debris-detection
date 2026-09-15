import math
from typing import List, Optional

from schemas import BoundingBox, DetectedObject
import config
from position import vincenty_direct


def extract_detections(result, annotation: dict, ship_location: Optional[dict] = None) -> List[DetectedObject]:
    """Build API objects from XML annotations and attach YOLO confidence when matched."""
    if ship_location is None:
        ship_location = config.random_ship_location()

    sonar = annotation["sonar"]
    elevation_rad = math.radians(sonar["elevation"])
    horizontal_range = sonar["range"] * math.cos(elevation_rad)
    depth = max(0.0, sonar["range"] * math.sin(elevation_rad))
    azimuth_rad = math.radians(sonar["azimuth"])
    local_x = horizontal_range * math.sin(azimuth_rad)
    local_z = -horizontal_range * math.cos(azimuth_rad)
    object_latitude, object_longitude = vincenty_direct(
        ship_location["latitude"],
        ship_location["longitude"],
        sonar["azimuth"],
        horizontal_range,
    )

    yolo_objects = []

    for box in result.boxes:
        class_id = int(box.cls[0])
        xmin, ymin, xmax, ymax = map(int, box.xyxy[0].tolist())
        yolo_objects.append({
            "name": result.names[class_id],
            "confidence": round(float(box.conf[0]), 4),
            "xmin": xmin,
            "ymin": ymin,
            "xmax": xmax,
            "ymax": ymax,
        })

    detected_objects = []
    for item in yolo_objects:
        detected_objects.append(
            DetectedObject(
                name=item["name"],
                confidence=item["confidence"],
                bndbox=BoundingBox(
                    xmin=item["xmin"],
                    ymin=item["ymin"],
                    xmax=item["xmax"],
                    ymax=item["ymax"],
                ),
                latitude=round(object_latitude, 8),
                longitude=round(object_longitude, 8),
                sonar_range=sonar["range"],
                sonar_azimuth=sonar["azimuth"],
                sonar_elevation=sonar["elevation"],
                sonar_soundspeed=sonar.get("soundspeed"),
                sonar_frequency=sonar.get("frequency"),
                depth=round(depth, 4),
                local_x=round(local_x, 4),
                local_z=round(local_z, 4),
            )
        )

    return detected_objects
