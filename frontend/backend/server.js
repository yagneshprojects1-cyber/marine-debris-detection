const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5000);
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || "*";
const ROOT_DIR = path.resolve(__dirname, "..");
const PYTHON_FILE = path.join(__dirname, "position.py");
const CSV_FILE = path.join(__dirname, "geotag.csv");
const OUTPUT_FILE = path.join(__dirname, "geotag_calculated.json");

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function sendFileDownload(res, filePath, filename) {
  const stream = fs.createReadStream(filePath);

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Access-Control-Allow-Origin": "*",
  });

  stream.pipe(res);
}

function runPositionScript() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(OUTPUT_FILE)) {
      fs.unlinkSync(OUTPUT_FILE);
    }

    const child = spawn("python", [
      PYTHON_FILE,
      CSV_FILE,
      "--output",
      OUTPUT_FILE,
    ], {
      cwd: ROOT_DIR,
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `position.py exited with code ${code}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/$/, "");

  if (req.method === "POST" && pathname === "/api/calculate-position") {
    try {
      const result = await runPositionScript();
      const positions = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      sendJson(res, 200, {
        message: "Positions calculated",
        inputFile: "backend/geotag.csv",
        outputFile: "backend/geotag_calculated.json",
        count: positions.length,
        log: result.stdout,
      });
    } catch (err) {
      sendJson(res, 500, {
        message: "Failed to calculate positions",
        error: err.message,
      });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/geotag-calculated") {
    if (!fs.existsSync(OUTPUT_FILE)) {
      sendJson(res, 404, {
        message: "geotag_calculated.json has not been generated yet",
      });
      return;
    }

    try {
      const positions = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
      sendJson(res, 200, positions);
    } catch (err) {
      sendJson(res, 500, {
        message: "Failed to read generated positions",
        error: err.message,
      });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/download-geotag-calculated") {
    if (!fs.existsSync(OUTPUT_FILE)) {
      sendJson(res, 404, {
        message: "geotag_calculated.json has not been generated yet",
      });
      return;
    }

    sendFileDownload(res, OUTPUT_FILE, "geotag_calculated.json");
    return;
  }

  sendJson(res, 404, { message: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
