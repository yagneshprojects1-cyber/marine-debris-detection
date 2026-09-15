import "../App.css";

export default function AnnotatedImagePage({ apiBaseUrl, imageUrl }) {
  if (!imageUrl) return null;

  return (
    <div className="annotated-page">
      <h2 className="annotated-page-title">Detected Object Image</h2>
      <img
        src={`${apiBaseUrl}${imageUrl}`}
        alt="YOLO detections"
        className="annotated-page-image"
      />
    </div>
  );
}