import React, { useRef, useState } from "react";
import "./UploadPage.css";
import UploadHeader from "../components/upload/UploadHeader";
import UploadToolbar from "../components/upload/UploadToolbar";
import UploadStatus from "../components/upload/UploadStatus";
import ImagePreviews from "../components/upload/ImagePreviews";
import DetectionResults from "../components/upload/DetectionResults";
import BatchDetectionDetail from "../components/upload/BatchDetectionDetail";
import BatchUploadPanel from "../components/upload/BatchUploadPanel";
import BatchUploadToolbar from "../components/upload/BatchUploadToolbar";
import { batchDetect, batchPreprocess, detectImage, preprocessImage } from "../utils/detectionApi";

/**
 * UploadPage.jsx
 *
 * Full debris-detection workflow:
 *   1. User selects a sonar image (.bmp).
 *   2. The image is sent to  POST /api/preprocess            (API 1).
 *   3. On success the same image is AUTOMATICALLY forwarded to
 *      POST /api/detect/{image_id}                           (API 2 - YOLO + geotag).
 *   4. Once detections are back, three actions become available:
 *        - Show Object on Map    -> plots lat/lon on the Maps page
 *        - Show Object on Image  -> displays the YOLO annotated image
 *        - Generate Report       -> downloads the JSON report       (API 3)
 */

export default function UploadPage({
  aiApiBaseUrl,
  onDetectionComplete,
}) {
  const [uploadMode, setUploadMode] = useState("single");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedXmlFile, setSelectedXmlFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [batchImageFiles, setBatchImageFiles] = useState([]);
  const [batchXmlFiles, setBatchXmlFiles] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);
  const [batchDetailView, setBatchDetailView] = useState("results");

  const [preprocessInfo, setPreprocessInfo] = useState(null); // { message, imageUrl }
  const [detectionResult, setDetectionResult] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleUploadOtherImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setSelectedXmlFile(null);
    setPreviewUrl(null);
    setPreprocessInfo(null);
    setDetectionResult(null);
    setBatchImageFiles([]);
    setBatchXmlFiles([]);
    setBatchItems([]);
    setBatchSummary(null);
    setSelectedBatchItem(null);
    setBatchDetailView("results");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onDetectionComplete) onDetectionComplete(null);
  };

  const handleModeChange = (mode) => {
    if (mode === uploadMode || isBusy) return;
    handleUploadOtherImage();
    setUploadMode(mode);
  };

  /* -- Step 0: file selection ------------------------------------------------ */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPreprocessInfo(null);
    setDetectionResult(null);
    setError("");
    if (onDetectionComplete) onDetectionComplete(null);

    if (!file) return;
    /*
    if (!file.name.toLowerCase().endsWith(".bmp")) {
      alert("Please select a .bmp format image.");
      e.target.value = "";
      return;
    }
    */
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleXmlChange = (e) => {
    setSelectedXmlFile(e.target.files[0] || null);
    setError("");
  };

  /* -- Full pipeline: preprocess -> detect ------------------------------------ */
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

  const handleBatchUploadAndDetect = async () => {
    if (batchImageFiles.length === 0 || batchXmlFiles.length === 0) {
      setError("Choose batch images and their matching XML annotation files.");
      return;
    }

    setUploading(true);
    setError("");
    setDetectionResult(null);
    setPreprocessInfo(null);
    setBatchSummary(null);
    setSelectedBatchItem(null);
    setBatchDetailView("results");
    setBatchItems(batchImageFiles.map((file) => ({
      filename: file.name,
      phase: "queued",
    })));
    if (onDetectionComplete) onDetectionComplete(null);

    try {
      setBatchItems(batchImageFiles.map((file) => ({
        filename: file.name,
        phase: "preprocessing",
      })));

      const preprocessResult = await batchPreprocess(aiApiBaseUrl, batchImageFiles, batchXmlFiles);
      setBatchSummary({
        total: preprocessResult.total,
        accepted: preprocessResult.accepted,
        rejected: preprocessResult.rejected,
      });

      const acceptedItems = preprocessResult.items.filter((item) => item.status === "success" && item.image_id);
      setBatchItems(preprocessResult.items.map((item) => ({
        filename: item.original_filename,
        phase: item.status === "success" ? "detecting" : "error",
        imageId: item.image_id,
        error: item.error,
      })));

      setUploading(false);
      setDetecting(true);

      const results = await batchDetect(
        aiApiBaseUrl,
        acceptedItems.map((item) => item.image_id),
        (index, total, progress) => {
          const completedIds = new Set(acceptedItems.slice(0, index).map((item) => item.image_id));
          setBatchItems((currentItems) => currentItems.map((item) => {
            if (item.phase === "error") return item;
            if (completedIds.has(item.imageId)) {
              return {
                ...item,
                phase: progress.status === "success" && item.imageId === acceptedItems[index - 1]?.image_id
                  ? "done"
                  : item.phase === "detecting"
                    ? "done"
                    : item.phase,
                result: item.imageId === acceptedItems[index - 1]?.image_id ? progress.data : item.result,
                error: item.imageId === acceptedItems[index - 1]?.image_id ? progress.error : item.error,
              };
            }
            return item;
          }));
        }
      );

      const successfulResults = results
        .filter((item) => item.status === "success")
        .map((item) => item.data);
      const latestResult = successfulResults[successfulResults.length - 1] || null;
      setDetectionResult(latestResult);
      setPreprocessInfo({
        message: `Batch complete: ${successfulResults.length}/${acceptedItems.length} image(s) detected.`,
      });
      if (onDetectionComplete) onDetectionComplete(latestResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setDetecting(false);
    }
  };

  const isBusy = uploading || detecting;
  const hasBatchActivity = batchItems.length > 0;
  const showSingleAnalysis = uploadMode === "single";

  return (
    <div className="upload-page">
      <div className="upload-inner dashboard-layout">
        <aside className="upload-sidebar">
          <UploadHeader onReset={handleUploadOtherImage} disabled={isBusy} />
          <span className="upload-mode-label">Upload mode</span>
          <div className="upload-mode-toggle" aria-label="Upload mode">
            <button
              type="button"
              className={uploadMode === "single" ? "active" : ""}
              onClick={() => handleModeChange("single")}
              disabled={isBusy}
            >
              Single
            </button>
            <button
              type="button"
              className={uploadMode === "batch" ? "active" : ""}
              onClick={() => handleModeChange("batch")}
              disabled={isBusy}
            >
              Batch
            </button>
          </div>
          {uploadMode === "single" ? (
            <UploadToolbar
              fileInputRef={fileInputRef}
              selectedFile={selectedFile}
              selectedXmlFile={selectedXmlFile}
              onFileChange={handleFileChange}
              onXmlChange={handleXmlChange}
              onSubmit={handleUploadAndDetect}
              disabled={isBusy}
              uploading={uploading}
              detecting={detecting}
            />
          ) : (
            <BatchUploadToolbar
              imageFiles={batchImageFiles}
              xmlFiles={batchXmlFiles}
              onImagesChange={setBatchImageFiles}
              onXmlsChange={setBatchXmlFiles}
              onSubmit={handleBatchUploadAndDetect}
              disabled={isBusy}
              running={isBusy}
            />
          )}
          <UploadStatus
            uploading={uploading}
            detecting={detecting}
            error={error}
            preprocessInfo={preprocessInfo}
            isBusy={isBusy}
          />
        </aside>
        <main className="results-workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">Live analysis workspace</span>
            </div>
            <span className={`workspace-state${isBusy ? " is-busy" : ""}`}>
              <span className="state-dot" />
              {isBusy ? "Processing" : detectionResult ? "Analysis ready" : "Awaiting input"}
            </span>
          </div>
          {hasBatchActivity && (
            <section className="workspace-batch-status" aria-label="Batch analysis progress">
              {selectedBatchItem?.result ? (
                <BatchDetectionDetail
                  item={selectedBatchItem}
                  activeView={batchDetailView}
                  onViewChange={setBatchDetailView}
                  onBack={() => setSelectedBatchItem(null)}
                  apiBaseUrl={aiApiBaseUrl}
                />
              ) : (
                <>
                  <div className="workspace-section-heading">
                    <h2>Batch analysis progress</h2>
                    <span>{isBusy ? "Running detections" : "Batch complete"}</span>
                  </div>
                  <BatchUploadPanel
                    items={batchItems}
                    summary={batchSummary}
                    onItemClick={(item) => {
                      setSelectedBatchItem(item);
                      setBatchDetailView("results");
                    }}
                  />
                </>
              )}
            </section>
          )}
          {showSingleAnalysis && (
            <ImagePreviews
              apiBaseUrl={aiApiBaseUrl}
              previewUrl={previewUrl}
              preprocessInfo={preprocessInfo}
              detectionResult={detectionResult}
            />
          )}
          {showSingleAnalysis && <DetectionResults detectionResult={detectionResult} />}
        </main>
      </div>
    </div>
  );
}
