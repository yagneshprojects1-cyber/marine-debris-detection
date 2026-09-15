"""Parse uploaded sonar annotation XML without dataset lookups or defaults."""

from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


def _required_float(node: ET.Element, name: str) -> float:
    value = node.findtext(name)
    if value is None or not value.strip():
        raise ValueError(f"XML sonar field '{name}' is required.")
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"XML sonar field '{name}' must be numeric.") from exc


def parse_annotation(xml_path: Path) -> dict[str, Any]:
    """Return sonar metadata and annotated objects from one uploaded XML file."""
    try:
        root = ET.parse(xml_path).getroot()
    except ET.ParseError as exc:
        raise ValueError("The uploaded XML file is not valid.") from exc

    sonar = root.find("sonar")
    if sonar is None:
        raise ValueError("XML must contain a <sonar> section.")

    sonar_data = {
        "range": _required_float(sonar, "range"),
        "azimuth": _required_float(sonar, "azimuth"),
        "elevation": _required_float(sonar, "elevation"),
        "soundspeed": _required_float(sonar, "soundspeed"),
        "frequency": sonar.findtext("frequency") or "",
    }
    if sonar_data["range"] < 0:
        raise ValueError("XML sonar range cannot be negative.")

    objects = []
    for object_node in root.findall("object"):
        name = (object_node.findtext("name") or "").strip()
        box = object_node.find("bndbox")
        if not name or box is None:
            raise ValueError("Each XML object requires a name and bounding box.")
        try:
            bbox = {field: int(box.findtext(field)) for field in ("xmin", "ymin", "xmax", "ymax")}
        except (TypeError, ValueError) as exc:
            raise ValueError("XML bounding-box values must be integers.") from exc
        objects.append({"name": name, "bndbox": bbox})

    file_node = root.find("file")
    return {
        "sonar": sonar_data,
        "folder": file_node.findtext("folder") if file_node is not None else "",
        "filename": file_node.findtext("filename") if file_node is not None else "",
        "size": {
            "width": int(root.findtext("size/width")),
            "height": int(root.findtext("size/height")),
            "channel": int(root.findtext("size/channel")),
        },
        "objects": objects,
    }
