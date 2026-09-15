from ultralytics import YOLO
from pathlib import Path

model_path = Path(__file__).resolve().parents[1] / "assets" / "models" / "bestv2.pt"
model = YOLO(str(model_path))

model.export(
    format="onnx",
    imgsz=640,
    simplify=True
)