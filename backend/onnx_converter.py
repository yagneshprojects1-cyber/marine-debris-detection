from ultralytics import YOLO

model = YOLO("bestv2.pt")

model.export(
    format="onnx",
    imgsz=640,
    simplify=True
)