import { useRef } from "react";

export default function SimulationUploadToolbar({
  imageFiles,
  xmlFiles,
  startFile,
  fileCount,
  onFolderChange,
  onStartFileChange,
  onFileCountChange,
  onSubmit,
  disabled,
  running,
  completed,
  hasUnsavedResults = false,
  onBlocked,
}) {
  const folderRef = useRef(null);
  const canSubmit = imageFiles.length > 0 && xmlFiles.length > 0 && startFile && Number(fileCount) > 0 && !disabled && !completed && !hasUnsavedResults;

  const handleFolderChange = (event) => {
    if (hasUnsavedResults) {
      onBlocked?.();
      event.target.value = "";
      return;
    }
    const files = Array.from(event.target.files || []);
    onFolderChange(files);
  };

  return (
    <div className="upload-toolbar simulation-toolbar">
      <label className="file-label">
        Choose Simulation Folder
        <input
          ref={folderRef}
          className="file-input"
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFolderChange}
        />
      </label>

      {imageFiles.length > 0 && (
        <span className="file-name">
          {imageFiles.length} BMP image{imageFiles.length !== 1 ? "s" : ""} found
        </span>
      )}
      {xmlFiles.length > 0 && (
        <span className="file-name">
          {xmlFiles.length} XML file{xmlFiles.length !== 1 ? "s" : ""} found
        </span>
      )}

      <label className="simulation-field">
        Start BMP file
        <select
          className="simulation-input simulation-file-select"
          value={startFile}
          onChange={(event) => onStartFileChange(event.target.value)}
          disabled={imageFiles.length === 0}
        >
          <option value="">Select starting BMP</option>
          {imageFiles.map((file) => (
            <option key={file.name} value={file.name}>{file.name}</option>
          ))}
        </select>
      </label>

      <label className="simulation-field">
        File count
        <input
          className="simulation-input simulation-count-input"
          type="number"
          min="1"
          max={imageFiles.length || undefined}
          value={fileCount}
          onChange={(event) => onFileCountChange(event.target.value)}
          placeholder="15"
        />
      </label>

      <button
        type="button"
        className="action-button primary"
        onClick={() => {
          if (hasUnsavedResults) {
            onBlocked?.();
            return;
          }
          onSubmit();
        }}
        disabled={!canSubmit}
        style={{ marginLeft: "auto" }}
      >
        {running ? "Running simulation..." : completed ? "Simulation Complete" : "Start Simulation"}
      </button>
    </div>
  );
}
