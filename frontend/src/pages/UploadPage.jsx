import React, { useRef, useState } from "react";
import "./UploadPage.css";
import UploadHeader from "../components/upload/UploadHeader";
import UploadToolbar from "../components/upload/UploadToolbar";
import UploadStatus from "../components/upload/UploadStatus";
import ImagePreviews from "../components/upload/ImagePreviews";
import DetectionResults from "../components/upload/DetectionResults";
import { detectImage, preprocessImage } from "../utils/detectionApi";

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedXmlFile, setSelectedXmlFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onDetectionComplete) onDetectionComplete(null);
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

  const isBusy = uploading || detecting;

  return (
    <div className="upload-page">
      <div className="upload-inner dashboard-layout">
        <aside className="upload-sidebar">
          <UploadHeader onReset={handleUploadOtherImage} disabled={isBusy} />
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
          <ImagePreviews
            apiBaseUrl={aiApiBaseUrl}
            previewUrl={previewUrl}
            preprocessInfo={preprocessInfo}
            detectionResult={detectionResult}
          />
          <DetectionResults detectionResult={detectionResult} />
        </main>
      </div>
    </div>
  );
}
