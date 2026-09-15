export default function UploadStatus({ uploading, detecting, error, preprocessInfo, isBusy }) {
  return (
    <>
      {uploading && <div className="status-banner info">Step 1/2 - Preprocessing image...</div>}
      {detecting && <div className="status-banner info">Step 2/2 - Running YOLO detection...</div>}
      {error && <div className="status-banner error">Error: {error}</div>}
      {preprocessInfo && !isBusy && (
        <div className="status-banner success">{preprocessInfo.message}</div>
      )}
    </>
  );
}