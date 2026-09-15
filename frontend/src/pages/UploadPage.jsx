import React, { useRef, useState } from "react";
import "./UploadPage.css";
import UploadHeader from "../components/upload/UploadHeader";
import UploadToolbar from "../components/upload/UploadToolbar";
import UploadStatus from "../components/upload/UploadStatus";
import ImagePreviews from "../components/upload/ImagePreviews";
import DetectionResults from "../components/upload/DetectionResults";
import BatchUploadToolbar from "../components/upload/BatchUploadToolbar";
import BatchUploadPanel from "../components/upload/BatchUploadPanel";
import { detectImage, preprocessImage, batchPreprocess } from "../utils/detectionApi";

/**
 * UploadPage.jsx
 *
 * Two modes, toggled by the "Single / Batch" switch in the header:
 *
 * SINGLE MODE (existing behaviour)
 *   1. User picks one .bmp + one .xml
 *   2. POST /api/preprocess  →  image_id
 *   3. POST /api/detect/{image_id}  →  results shown in workspace
 *
 * BATCH MODE (new)
 *   1. User picks N images + N xmls (matched by filename stem)
 *   2. POST /api/preprocess/batch  →  accepted image_ids
 *   3. POST /api/detect/{image_id} sequentially for each accepted pair
 *   4. Each completed detection is written to MongoDB as its own entry
 *   5. Live progress list shows per-image status
 */

export default function UploadPage({ aiApiBaseUrl, onDetectionComplete }) {
  // ── mode toggle ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("single"); // "single" | "batch"

  // ── single mode state ──────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedXmlFile, setSelectedXmlFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [preprocessInfo, setPreprocessInfo] = useState(null);
  const [detectionResult, setDetectionResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // ── batch mode state ───────────────────────────────────────────────────────
  const [batchImages, setBatchImages] = useState([]);
  const [batchXmls, setBatchXmls] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchItems, setBatchItems] = useState([]);   // per-file progress rows
  const [batchSummary, setBatchSummary] = useState(null);
  const [batchError, setBatchError] = useState("");

  // ── helpers ────────────────────────────────────────────────────────────────
  const resetSingle = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setSelectedXmlFile(null);
    setPreviewUrl(null);
    setPreprocessInfo(null);
    setDetectionResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onDetectionComplete) onDetectionComplete(null);
  };

  const resetBatch = () => {
    setBatchImages([]);
    setBatchXmls([]);
    setBatchItems([]);
    setBatchSummary(null);
    setBatchError("");
  };

  const switchMode = (next) => {
    resetSingle();
    resetBatch();
    setMode(next);
  };

  // ── single handlers ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPreprocessInfo(null);
    setDetectionResult(null);
    setError("");
    if (onDetectionComplete) onDetectionComplete(null);
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleXmlChange = (e) => {
    setSelectedXmlFile(e.target.files[0] || null);
    setError("");
  };

  const handleUploadAndDetect = async () => {
    if (!selectedFile || !selectedXmlFile) {
      setError("Choose both an image and its XML annotation file.");
      return;
    }
    setUploading(true);
    setError("");
    setDetectionResult(null);
    if (onDetectionComplete) onDetectionComplete(null);

    try {
      const { imageId, info } = await preprocessImage(aiApiBaseUrl, selectedFile, selectedXmlFile);
      setPreprocessInfo(info);
      setUploading(false);
      setDetecting(true);
      const result = await detectImage(aiApiBaseUrl, imageId);
      setDetectionResult(result);
      if (onDetectionComplete) onDetectionComplete(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setDetecting(false);
    }
  };

  // ── batch handlers ─────────────────────────────────────────────────────────
  const handleBatchRun = async () => {
    if (batchImages.length === 0 || batchXmls.length === 0) return;

    setBatchRunning(true);
    setBatchError("");
    setBatchSummary(null);

    // Initialise all rows as "queued"
    const initialItems = batchImages.map((f) => ({
      filename: f.name,
      phase: "queued",
      result: null,
      error: null,
    }));
    setBatchItems(initialItems);

    // --- Step 1: batch preprocess -------------------------------------------
    let preprocessResult;
    try {
      // Mark all as preprocessing
      setBatchItems((prev) => prev.map((it) => ({ ...it, phase: "preprocessing" })));
      preprocessResult = await batchPreprocess(aiApiBaseUrl, batchImages, batchXmls);
    } catch (err) {
      setBatchError(`Batch preprocessing failed: ${err.message}`);
      setBatchRunning(false);
      setBatchItems((prev) => prev.map((it) => ({ ...it, phase: "error", error: err.message })));
      return;
    }

    setBatchSummary({
      total: preprocessResult.total,
      accepted: preprocessResult.accepted,
      rejected: preprocessResult.rejected,
    });

    // Map filename → preprocess item for quick lookup
    const preprocessMap = {};
    for (const item of preprocessResult.items) {
      preprocessMap[item.original_filename] = item;
    }

    // Reflect preprocessing outcome in the row list
    setBatchItems((prev) =>
      prev.map((row) => {
        const pp = preprocessMap[row.filename];
        if (!pp) return { ...row, phase: "error", error: "Not returned by server" };
        if (pp.status === "error") return { ...row, phase: "error", error: pp.error };
        return { ...row, phase: "detecting" };
      })
    );

    // --- Step 2: detect each accepted image sequentially -------------------
    const acceptedItems = preprocessResult.items.filter((i) => i.status === "success");

    for (const ppItem of acceptedItems) {
      try {
        const result = await detectImage(aiApiBaseUrl, ppItem.image_id);
        setBatchItems((prev) =>
          prev.map((row) =>
            row.filename === ppItem.original_filename
              ? { ...row, phase: "done", result }
              : row
          )
        );
        // Notify parent of the last completed detection (for map/dashboard updates)
        if (onDetectionComplete) onDetectionComplete(result);
      } catch (err) {
        setBatchItems((prev) =>
          prev.map((row) =>
            row.filename === ppItem.original_filename
              ? { ...row, phase: "error", error: err.message }
              : row
          )
        );
      }
    }

    setBatchRunning(false);
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const isSingleBusy = uploading || detecting;

  return (
    <div className="upload-page">
      <div className="upload-inner dashboard-layout">
        <aside className="upload-sidebar">
          {/* Mode toggle */}
          <div className="mode-toggle">
            <button
              className={`mode-btn${mode === "single" ? " mode-btn--active" : ""}`}
              onClick={() => switchMode("single")}
              disabled={isSingleBusy || batchRunning}
            >
              Single
            </button>
            <button
              className={`mode-btn${mode === "batch" ? " mode-btn--active" : ""}`}
              onClick={() => switchMode("batch")}
              disabled={isSingleBusy || batchRunning}
            >
              Batch
            </button>
          </div>

          {mode === "single" ? (
            <>
              <UploadHeader onReset={resetSingle} disabled={isSingleBusy} />
              <UploadToolbar
                fileInputRef={fileInputRef}
                selectedFile={selectedFile}
                selectedXmlFile={selectedXmlFile}
                onFileChange={handleFileChange}
                onXmlChange={handleXmlChange}
                onSubmit={handleUploadAndDetect}
                disabled={isSingleBusy}
                uploading={uploading}
                detecting={detecting}
              />
              <UploadStatus
                uploading={uploading}
                detecting={detecting}
                error={error}
                preprocessInfo={preprocessInfo}
                isBusy={isSingleBusy}
              />
            </>
          ) : (
            <>
              <div className="upload-header">
                <div>
                  <h2 className="upload-title">Batch Analysis</h2>
                  <p className="upload-subtitle">
                    Select multiple images and their matching XML files.
                    Pairs are matched by filename stem — <code>00001.bmp</code> ↔ <code>00001.xml</code>.
                    Each image is saved as its own entry in the database.
                  </p>
                </div>
                <button
                  className="action-button upload-other-button"
                  onClick={resetBatch}
                  disabled={batchRunning}
                >
                  Clear
                </button>
              </div>
              <BatchUploadToolbar
                imageFiles={batchImages}
                xmlFiles={batchXmls}
                onImagesChange={setBatchImages}
                onXmlsChange={setBatchXmls}
                onSubmit={handleBatchRun}
                disabled={batchRunning}
                running={batchRunning}
              />
              {batchError && (
                <div className="status-banner error" style={{ marginTop: 14 }}>
                  {batchError}
                </div>
              )}
            </>
          )}
        </aside>

        <main className="results-workspace">
          {mode === "single" ? (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="eyebrow">Live analysis workspace</span>
                </div>
                <span className={`workspace-state${isSingleBusy ? " is-busy" : ""}`}>
                  <span className="state-dot" />
                  {isSingleBusy ? "Processing" : detectionResult ? "Analysis ready" : "Awaiting input"}
                </span>
              </div>
              <ImagePreviews
                apiBaseUrl={aiApiBaseUrl}
                previewUrl={previewUrl}
                preprocessInfo={preprocessInfo}
                detectionResult={detectionResult}
              />
              <DetectionResults detectionResult={detectionResult} />
            </>
          ) : (
            <>
              <div className="workspace-heading">
                <div>
                  <span className="eyebrow">Batch processing workspace</span>
                </div>
                <span className={`workspace-state${batchRunning ? " is-busy" : ""}`}>
                  <span className="state-dot" />
                  {batchRunning
                    ? `Processing ${batchItems.filter((i) => i.phase === "done" || i.phase === "error").length}/${batchItems.length}`
                    : batchItems.length > 0
                    ? "Batch complete"
                    : "Awaiting input"}
                </span>
              </div>
              {batchItems.length === 0 ? (
                <div className="empty-workspace">
                  <div className="empty-mark">⊞</div>
                  <h2>Batch mode ready</h2>
                  <p>
                    Select multiple .bmp images and their matching .xml files, then click
                    "Run Batch". Each image will be preprocessed, detected, and saved to the
                    database independently.
                  </p>
                </div>
              ) : (
                <BatchUploadPanel items={batchItems} summary={batchSummary} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
