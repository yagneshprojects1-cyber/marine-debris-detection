import UploadPage from "../../pages/UploadPage";

export default function SonarAnalystDashboard({
  aiApiBaseUrl,
  onDetectionComplete,
  onNavigate,
  analystName,
}) {
  return (
    <UploadPage
      aiApiBaseUrl={aiApiBaseUrl}
      onDetectionComplete={onDetectionComplete}
      onNavigate={onNavigate}
      analystName={analystName}
    />
  );
}
