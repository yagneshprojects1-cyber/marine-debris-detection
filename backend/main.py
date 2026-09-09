"""
Debris Detector — FastAPI entry point
=====================================
Endpoints:
    POST  /api/preprocess               API 1: store + preprocess an image
    POST  /api/detect/{image_id}        API 2: YOLO detection + geotag lookup
    GET   /api/report/{image_id}        API 3: JSON report
    GET   /api/report/{image_id}/download  report as .json attachment
    GET   /api/stats                    API 4: dashboard counters
    POST  /api/calculate-position       API 5: batch geotag calculation

Run from the ``backend`` folder:
    uvicorn main:app --reload --port 8000
"""

import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

import config
from routers import detection, history, map_data, positions, preprocessing, reports, route_planning, stats
from services import yolo_service


class CORSEnsureMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are present on EVERY response, including 500 errors."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        origin = request.headers.get("origin", "*")

        try:
            response = await call_next(request)
        except Exception as exc:
            print(f"[Server] Unhandled exception: {type(exc).__name__}: {exc}")
            print(traceback.format_exc())
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {type(exc).__name__}: {str(exc)}"},
            )

        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "3600"

        elapsed = (time.time() - start) * 1000
        print(f"[Server] {request.method} {request.url.path} -> {response.status_code} ({elapsed:.1f}ms)")
        return response


app = FastAPI(
    title=config.APP_NAME,
    description="Sonar image preprocessing, AI debris detection and reporting.",
    version="1.0.0",
)

# ── CORS: allow requests from any URL (Vercel, localhost, etc.) ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Disposition"],
    max_age=3600,
)

app.add_middleware(CORSEnsureMiddleware)

# ── Serve uploaded & annotated images as static files ─────────────────────────
config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
config.RESULT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(config.DATA_DIR)), name="media")
app.mount("/3dmodels", StaticFiles(directory=str(config.BASE_DIR / "3dmodels")), name="3dmodels")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(preprocessing.router)
app.include_router(detection.router)
app.include_router(reports.router)
app.include_router(stats.router)
app.include_router(positions.router)
app.include_router(route_planning.router)
app.include_router(history.router)
app.include_router(map_data.router)


@app.on_event("startup")
async def on_startup():
    """Preload YOLO model when the server boots so it's ready for first request."""
    print("=" * 60)
    print(f"[Startup] {config.APP_NAME} is booting...")
    print(f"[Startup] Data directory: {config.DATA_DIR}")
    print(f"[Startup] Model weights: {config.MODEL_WEIGHTS_PATH} -> exists={config.MODEL_WEIGHTS_PATH.exists()}")
    print("=" * 60)

    model_ok = yolo_service.preload_model()
    if not model_ok:
        print("[Startup] WARNING: YOLO model failed to load. Detection API will return errors.")
        print(f"[Startup] Model error: {yolo_service.get_model_error()}")
    else:
        print("[Startup] YOLO model loaded and ready")

    print("=" * 60)
    print("[Startup] Server ready")
    print("=" * 60)


@app.get("/", tags=["Health"])
def health_check():
    """Simple liveness probe that also reports YOLO readiness."""
    return {
        "status": "ok",
        "app": config.APP_NAME,
        "yolo_ready": yolo_service.is_model_ready(),
        "model_exists": config.MODEL_WEIGHTS_PATH.exists(),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host=config.API_HOST, port=config.API_PORT, reload=True)
