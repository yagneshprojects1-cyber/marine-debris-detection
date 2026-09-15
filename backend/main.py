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
from pathlib import Path

# Allow "import config" etc. no matter which folder the server is started from.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from routers import detection, history, map_data, positions, preprocessing, reports, route_planning, stats

app = FastAPI(
    title=config.APP_NAME,
    description="Sonar image preprocessing, AI debris detection and reporting.",
    version="1.0.0",
)

# ── CORS: allow the React dev server to call the API ──────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/", tags=["Health"])
def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "app": config.APP_NAME}


if __name__ == "__main__":
    uvicorn.run("main:app", host=config.API_HOST, port=config.API_PORT, reload=True)
