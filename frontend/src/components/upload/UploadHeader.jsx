export default function UploadHeader({ onReset, disabled }) {
  return (
    <div className="upload-header">
      <div>
        <h2 className="upload-title">Sonar Image Analysis</h2>
        <p className="upload-subtitle">
          Upload a side-scan sonar image. It is preprocessed and then analyzed
          by the model to detect objects.
        </p>
      </div>
      <button
        type="button"
        className="action-button upload-other-button"
        onClick={onReset}
        disabled={disabled}
      >
        Upload other image
      </button>
    </div>
  );
}