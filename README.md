# Marine Debris Detection

AI-powered sonar image analysis platform for detecting underwater marine debris. Uploads sonar `.bmp` images with paired `.xml` annotation files, runs adaptive noise filtering followed by YOLO object detection, stores results in MongoDB Atlas, and visualises detections on an interactive map.

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| MongoDB Atlas | Active cluster with connection URI |

---

## Project Structure

```
marine-debris-detection/
├── backend/          # FastAPI + YOLO inference server
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/         # React UI
│   ├── src/
│   ├── package.json
│   └── .env.example
└── other-folders/    # Sample sonar images and XML annotations for testing
```

---

## 1 — Clone & enter the project

```bash
git clone <your-repo-url>
cd marine-debris-detection
```

---

## 2 — Backend setup

### 2a. Create a Python virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2b. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2c. Configure environment variables

```bash
cp .env.example .env
```

Open `backend/.env` and fill in your values:

```env
# Server
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
MONGODB_DATABASE=debris_detector
MONGODB_APP_NAME=debris-detector
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
MONGODB_ALLOW_INVALID_CERTS=true
```

> **MongoDB URI** — get this from your Atlas cluster → Connect → Drivers. Replace `<username>` and `<password>` with your database user credentials.

### 2d. Verify the YOLO model is present

The pre-trained model file `bestv2.pt` must exist at `backend/bestv2.pt`.  
Check with:

```bash
ls backend/bestv2.pt
```

### 2e. Start the backend server

```bash
# Make sure venv is active
source venv/bin/activate

uvicorn main:app --reload --port 8000
```

The API will be available at **http://localhost:8000**.  
Interactive API docs (Swagger UI): **http://localhost:8000/docs**

You should see in the terminal:
```
[Startup] YOLO model loaded and ready
[Startup] Server ready
```

---

## 3 — Frontend setup

Open a **new terminal**:

### 3a. Install dependencies

```bash
cd frontend
npm install
```

### 3b. Configure environment variables

```bash
cp .env.example .env
```

`frontend/.env` defaults are already correct for local development:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_AI_BACKEND_URL=http://localhost:8000
```

### 3c. Start the frontend

```bash
npm start
```

The app opens automatically at **http://localhost:3000**.

---

## 4 — Running the full stack

You need **two terminals** running simultaneously:

| Terminal | Command | URL |
|---|---|---|
| 1 — Backend | `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000` | http://localhost:8000 |
| 2 — Frontend | `cd frontend && npm start` | http://localhost:3000 |

---

## 5 — Testing with sample files

Sample sonar images and XML annotations are in `other-folders/`:

```
other-folders/
├── 00001.bmp  ↔  00001.xml   # has labelled objects
├── 00002.bmp  ↔  00002.xml   # has labelled objects
├── 00005.bmp  ↔  00005.xml   # no labelled objects (valid — YOLO may still detect)
├── 00006.bmp  ↔  00006.xml   # no labelled objects
└── ...
```

### Single image upload

1. Go to the **Dashboard** tab
2. The mode toggle shows **Single** by default
3. Click **Choose Image** → select `00001.bmp`
4. Click **Choose XML** → select `00001.xml`
5. Click **Upload & Detect**
6. Results appear in the workspace panel on the right

### Batch upload (multiple images at once)

1. Go to the **Dashboard** tab
2. Click the **Batch** button in the mode toggle
3. Click **Choose Images (.bmp)** → select multiple `.bmp` files (e.g. `00001.bmp`, `00002.bmp`)
4. Click **Choose XML Files** → select their matching `.xml` files
5. The **Pairing preview** shows which images are matched (✓) or unmatched (✗) before you submit
6. Click **Run Batch** — each image is processed sequentially and saved as its own MongoDB entry

> **Naming convention:** images and XMLs are paired by filename stem.  
> `00001.bmp` will automatically match `00001.xml`.

---

## 6 — Features overview

| Tab | Description |
|---|---|
| **Dashboard** | Upload single or batch sonar images, run YOLO detection, view annotated results |
| **History** | Browse all past detections from MongoDB; sort by date/timestamp; select and delete records |
| **Show Object on Map** | Interactive Leaflet map plotting detection coordinates |
| **Show in 3D Map** | Three.js 3D terrain view of detections |
| **Route Optimization** | Plan optimal debris collection routes |

---

## 7 — API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check + YOLO status |
| `POST` | `/api/preprocess` | Upload single image + XML, returns `image_id` |
| `POST` | `/api/preprocess/batch` | Upload multiple images + XMLs matched by stem |
| `POST` | `/api/detect/{image_id}` | Run YOLO detection on a preprocessed image |
| `GET` | `/api/report/{image_id}` | Get JSON detection report |
| `GET` | `/api/history` | List all detection history from MongoDB |
| `DELETE` | `/api/history` | Delete records by `image_ids` (JSON body) |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/map-data` | Latest image detections for the map |

Full interactive docs at **http://localhost:8000/docs**

---

## 8 — Deployment (Render)

The backend includes a `render.yaml` for one-click deployment to [Render](https://render.com):

1. Push code to GitHub
2. In Render, click **New → Blueprint** and connect your repo
3. Set the `MONGODB_URI` environment variable in the Render dashboard
4. Update `frontend/.env` to point `REACT_APP_BACKEND_URL` at your Render service URL
5. Deploy the frontend to Vercel or Netlify (`npm run build` produces the static output in `frontend/build/`)

---

## 9 — Troubleshooting

| Problem | Fix |
|---|---|
| `YOLO model failed to load` | Ensure `backend/bestv2.pt` exists |
| `MongoDB connection error` | Check `MONGODB_URI` in `backend/.env`; verify IP whitelist in Atlas |
| `XML must contain a <sonar> section` | The uploaded XML is missing required sonar metadata |
| `No matching XML found for 00005.bmp` | XML filename stem must exactly match image stem |
| Frontend shows blank page | Confirm backend is running on port 8000 and CORS allows `localhost:3000` |
| `externally-managed-environment` pip error | Use a virtual environment (`python3 -m venv venv`) |
