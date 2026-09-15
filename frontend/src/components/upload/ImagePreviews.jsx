function resolveImageUrl(apiBaseUrl, imageUrl) {
  if (!imageUrl || /^(https?:)?\/\//i.test(imageUrl)) return imageUrl;
  return `${apiBaseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

export default function ImagePreviews({ apiBaseUrl, previewUrl, preprocessInfo, detectionResult }) {
  if (!previewUrl && !preprocessInfo && !detectionResult) {
    return (
      <div className="empty-workspace">
        <div className="empty-mark">+</div>
        <h2>Your analysis canvas is ready</h2>
        <p>Upload an image and XML annotation to see the inspection output here.</p>
      </div>
    );
  }

  return (
    <div className="preview-grid">
      {previewUrl && (
        <div className="preview-card">
          <div className="preview-card-heading"><h3>Original input</h3><span>01</span></div>
          <p className="preview-caption preview-caption-placeholder" aria-hidden="true">&nbsp;</p>
          <img className="preview-image" src={previewUrl} alt="Original" />
        </div>
      )}
      {preprocessInfo && (
        <div className="preview-card">
          <div className="preview-card-heading"><h3>Preprocessed then detected object</h3><span>02</span></div>
          <p className="preview-caption">
            {detectionResult?.annotated_image_url ? "Detected object result" : preprocessInfo.message}
          </p>
          <img
            className="preview-image"
            src={detectionResult?.annotated_image_url
              ? resolveImageUrl(apiBaseUrl, detectionResult.annotated_image_url)
              : preprocessInfo.imageUrl}
            alt="Preprocessed and detected object"
          />
        </div>
      )}
    </div>
  );
}