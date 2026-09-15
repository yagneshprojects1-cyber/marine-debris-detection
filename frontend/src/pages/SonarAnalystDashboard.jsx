import UploadPage from "./UploadPage";
import "./SonarAnalystDashboard.css";

export default function SonarAnalystDashboard({
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
