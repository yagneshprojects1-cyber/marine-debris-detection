export default function UploadToolbar({
  fileInputRef,
  selectedFile,
  selectedXmlFile,
  onFileChange,
  onXmlChange,
  onSubmit,
  disabled,
  uploading,
  detecting,
}) {
  return (
    <div className="upload-toolbar">
      <label className="file-label">
        Choose Image
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          onChange={onFileChange}
        />
      </label>

      {selectedFile && (
        <span className="file-name" title={selectedFile.name}>
          {selectedFile.name}
        </span>
      )}
      <label className="file-label">
        Choose XML
        <input className="file-input" type="file" accept=".xml,text/xml" onChange={onXmlChange} />
      </label>
      {selectedXmlFile && (
        <span className="file-name" title={selectedXmlFile.name}>{selectedXmlFile.name}</span>
      )}

      <button
        type="button"
        className="action-button primary"
        onClick={onSubmit}
        disabled={!selectedFile || !selectedXmlFile || disabled}
        style={{ marginLeft: "auto" }}
      >
        {uploading ? "Preprocessing..." : detecting ? "AI Detecting..." : "Upload & Detect"}
      </button>
    </div>
  );
}