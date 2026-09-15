import UploadPage from "./UploadPage";

export default function Dashboard({
  aiApiBaseUrl,
  onDetectionComplete,
  onNavigate,
}) {
  return (
    <UploadPage
      aiApiBaseUrl={aiApiBaseUrl}
      onDetectionComplete={onDetectionComplete}
      onNavigate={onNavigate}
    />
  );
}
