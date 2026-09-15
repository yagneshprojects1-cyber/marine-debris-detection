export function downloadReport(apiBaseUrl, imageId) {
  if (!imageId) return;

  const link = document.createElement("a");
  link.href = `${apiBaseUrl}/api/report/${imageId}/download`;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}