import React, { useEffect, useState } from "react";
import "./UploadPage.css";
import UploadHeader from "../components/upload/UploadHeader";
import UploadStatus from "../components/upload/UploadStatus";
import BatchDetectionDetail from "../components/upload/BatchDetectionDetail";
import BatchUploadPanel from "../components/upload/BatchUploadPanel";
import BatchUploadToolbar from "../components/upload/BatchUploadToolbar";
import SimulationUploadToolbar from "../components/upload/SimulationUploadToolbar";
import BatchSaveReviewModal from "../components/upload/BatchSaveReviewModal";
import { acceptBatchDetections, acceptDetection, batchDetect, batchPreprocess, simulationPreprocess } from "../utils/detectionApi";

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
  analystName,
}) {
  const [uploadMode, setUploadMode] = useState("simulation");
  const [simulationImageFiles, setSimulationImageFiles] = useState([]);
  const [simulationXmlFiles, setSimulationXmlFiles] = useState([]);
  const [simulationStartFile, setSimulationStartFile] = useState("");
  const [simulationFileCount, setSimulationFileCount] = useState("15");
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [batchImageFiles, setBatchImageFiles] = useState([]);
  const [batchXmlFiles, setBatchXmlFiles] = useState([]);
  const [batchItems, setBatchItems] = useState([]);
  const [batchSummary, setBatchSummary] = useState(null);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);
  const [batchDetailView, setBatchDetailView] = useState("results");
  const [acceptedBatchIds, setAcceptedBatchIds] = useState([]);
  const [batchSaveOpen, setBatchSaveOpen] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchSaved, setBatchSaved] = useState(false);

  const hasUnsavedBatchResults = batchItems.some(
    (item) => item.phase === "done" && item.result && !acceptedBatchIds.includes(item.result.image_id),
  );

  const [preprocessInfo, setPreprocessInfo] = useState(null); // { message, imageUrl }
  const [detectionResult, setDetectionResult] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleUploadOtherImage = () => {
    setSimulationImageFiles([]);
    setSimulationXmlFiles([]);
    setSimulationStartFile("");
    setSimulationFileCount("15");
    setSimulationCompleted(false);
    setPreprocessInfo(null);
    setDetectionResult(null);
    setBatchImageFiles([]);
    setBatchXmlFiles([]);
    setBatchItems([]);
    setBatchSummary(null);
    setSelectedBatchItem(null);
    setBatchDetailView("results");
    setAcceptedBatchIds([]);
    setBatchSaveOpen(false);
    setBatchSaved(false);
    setError("");
    if (onDetectionComplete) onDetectionComplete(null);
  };

  const handleModeChange = (mode) => {
    if (hasUnsavedBatchResults) {
      setToastMessage("Please save all detection results to the database before uploading more files.");
      return;
    }
    if (mode === uploadMode || isBusy) return;
    handleUploadOtherImage();
    setUploadMode(mode);
  };

  const handleBlockedUpload = () => {
    setToastMessage("Please save all detection results to the database before uploading more files.");
  };

  const handleSimulationFolderChange = (files) => {
    if (hasUnsavedBatchResults) {
      handleBlockedUpload();
      return;
    }
    const allImages = files.filter((file) => file.name.toLowerCase().endsWith(".bmp"));
    const allXmls = files.filter((file) => file.name.toLowerCase().endsWith(".xml"));
    const xmlStems = new Set(allXmls.map((file) => file.name.replace(/\.[^.]+$/, "").toLowerCase()));
    const images = allImages.filter((file) => xmlStems.has(file.name.replace(/\.[^.]+$/, "").toLowerCase()));
    const imageStems = new Set(images.map((file) => file.name.replace(/\.[^.]+$/, "").toLowerCase()));
    const xmls = allXmls.filter((file) => imageStems.has(file.name.replace(/\.[^.]+$/, "").toLowerCase()));
    setSimulationImageFiles(images);
    setSimulationXmlFiles(xmls);
    setSimulationStartFile(images[0]?.name || "");
    setSimulationCompleted(false);
    setError("");
    setPreprocessInfo(
      images.length < allImages.length || xmls.length < allXmls.length
        ? {
            type: "note",
            message: "Note: only BMP/XML files with matching names were selected. Unmatched files were excluded.",
          }
        : null,
    );
  };

  const handleBatchUploadAndDetect = async () => {
    if (hasUnsavedBatchResults) {
      handleBlockedUpload();
      return;
    }

    const isSimulation = uploadMode === "simulation";
    const availableImages = isSimulation ? simulationImageFiles : batchImageFiles;
    const availableXmls = isSimulation ? simulationXmlFiles : batchXmlFiles;
    let imageFiles = availableImages;
    let xmlFiles = availableXmls;

    if (availableImages.length === 0 || availableXmls.length === 0) {
      setError(isSimulation ? "Choose a simulation folder with BMP and XML files." : "Choose batch images and their matching XML annotation files.");
      return;
    }
    if (isSimulation && (!simulationStartFile || Number(simulationFileCount) < 1)) {
      setError("Enter a starting BMP file and a file count for the simulation.");
      return;
    }
    const startIndex = availableImages.findIndex((file) => file.name === simulationStartFile);
    if (isSimulation && (startIndex < 0 || startIndex + Number(simulationFileCount) > availableImages.length)) {
      setError(`The simulation count cannot exceed the ${availableImages.length - Math.max(startIndex, 0)} matched BMP/XML file(s) available from the selected start file.`);
      return;
    }
    if (isSimulation) {
      imageFiles = availableImages.slice(startIndex, startIndex + Number(simulationFileCount));
      const selectedStems = new Set(imageFiles.map((file) => file.name.replace(/\.[^.]+$/, "").toLowerCase()));
      xmlFiles = availableXmls.filter((file) => selectedStems.has(file.name.replace(/\.[^.]+$/, "").toLowerCase()));
    }

    setUploading(true);
    if (isSimulation) setSimulationCompleted(false);
    setError("");
    setDetectionResult(null);
    setPreprocessInfo(null);
    setBatchSummary(null);
    setSelectedBatchItem(null);
    setBatchDetailView("results");
    setAcceptedBatchIds([]);
    setBatchSaved(false);
    setBatchItems(imageFiles.map((file) => ({
      filename: file.name,
      phase: "queued",
    })));
    if (onDetectionComplete) onDetectionComplete(null);

    try {
      setBatchItems(imageFiles.map((file) => ({
        filename: file.name,
        phase: "preprocessing",
      })));

      const preprocessResult = isSimulation
        ? await simulationPreprocess(aiApiBaseUrl, imageFiles, xmlFiles, simulationStartFile, simulationFileCount)
        : await batchPreprocess(aiApiBaseUrl, imageFiles, xmlFiles);
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
      if (isSimulation) setSimulationCompleted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setDetecting(false);
    }
  };

  const isBusy = uploading || detecting;
  const hasBatchActivity = batchItems.length > 0;

  const handleAcceptBatchItem = async (item, labels) => {
    const imageId = item.result?.image_id;
    if (!imageId || acceptedBatchIds.includes(imageId)) return;

    try {
      await acceptDetection(
        aiApiBaseUrl,
        imageId,
        labels,
        item.result.annotated_image_url,
        analystName,
      );
      setAcceptedBatchIds((currentIds) => [...currentIds, imageId]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveAll = async (records) => {
    setBatchSaving(true);
    try {
      const response = await acceptBatchDetections(aiApiBaseUrl, records, analystName);
      setAcceptedBatchIds((currentIds) => [...new Set([...currentIds, ...response.image_ids])]);
      setBatchSaved(true);
      setBatchSaveOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchSaving(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-inner dashboard-layout">
        {toastMessage && (
          <div className="upload-toast" role="status" aria-live="polite">
            {toastMessage}
          </div>
        )}
        <aside className="upload-sidebar">
          <UploadHeader onReset={handleUploadOtherImage} disabled={isBusy} />
          <span className="upload-mode-label">Upload mode</span>
          <div className="upload-mode-toggle" aria-label="Upload mode">
            <button
              type="button"
              className={uploadMode === "simulation" ? "active" : ""}
              onClick={() => handleModeChange("simulation")}
              disabled={isBusy}
            >
              Simulation
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
          {uploadMode === "simulation" ? (
            <SimulationUploadToolbar
              imageFiles={simulationImageFiles}
              xmlFiles={simulationXmlFiles}
              startFile={simulationStartFile}
              fileCount={simulationFileCount}
              onFolderChange={handleSimulationFolderChange}
              onStartFileChange={setSimulationStartFile}
              onFileCountChange={setSimulationFileCount}
              onSubmit={handleBatchUploadAndDetect}
              disabled={isBusy || hasUnsavedBatchResults}
              running={isBusy}
              completed={simulationCompleted}
              hasUnsavedResults={hasUnsavedBatchResults}
              onBlocked={handleBlockedUpload}
            />
          ) : (
            <BatchUploadToolbar
              imageFiles={batchImageFiles}
              xmlFiles={batchXmlFiles}
              onImagesChange={setBatchImageFiles}
              onXmlsChange={setBatchXmlFiles}
              onSubmit={handleBatchUploadAndDetect}
              disabled={isBusy || hasUnsavedBatchResults}
              running={isBusy}
              hasUnsavedResults={hasUnsavedBatchResults}
              onBlocked={handleBlockedUpload}
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
                  onAccept={handleAcceptBatchItem}
                  accepted={acceptedBatchIds.includes(selectedBatchItem.result.image_id)}
                />
              ) : (
                <>
                  <div className="workspace-section-heading">
                    <h2>Batch analysis progress</h2>
                    <div className="batch-completion-actions">
                      <span>{isBusy ? "Running detections" : "Batch complete"}</span>
                      {!isBusy && batchItems.some((item) => item.phase === "done" && item.result) && (
                        <button
                          type="button"
                          className={`batch-save-all-button${batchSaved ? " saved" : ""}`}
                          onClick={() => setBatchSaveOpen(true)}
                          disabled={batchSaved}
                        >
                          {batchSaved ? "All data saved" : "Save all in database"}
                        </button>
                      )}
                    </div>
                  </div>
                  <BatchUploadPanel
                    items={batchItems}
                    summary={batchSummary}
                    acceptedImageIds={acceptedBatchIds}
                    onItemClick={(item) => {
                      setSelectedBatchItem(item);
                      setBatchDetailView("results");
                    }}
                  />
                </>
              )}
            </section>
          )}
          {!detectionResult && !hasBatchActivity && !isBusy && (
            <div className="empty-workspace" aria-live="polite">
              <span className="empty-mark" aria-hidden="true">+</span>
              <h2>Your analysis will appear here</h2>
              <p>
                Upload sonar image data to begin detecting and reviewing marine debris.
              </p>
            </div>
          )}
          {batchSaveOpen && (
            <BatchSaveReviewModal
              items={batchItems}
              onClose={() => setBatchSaveOpen(false)}
              onSave={handleSaveAll}
              apiBaseUrl={aiApiBaseUrl}
              saving={batchSaving}
            />
          )}
        </main>
      </div>
    </div>
  );
}
