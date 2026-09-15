export async function preprocessImage(apiBaseUrl, file, xmlFile) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("xml_file", xmlFile);

  const response = await fetch(`${apiBaseUrl}/api/preprocess`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data.detail || "Preprocessing failed");

  return {
    imageId: data.image_id,
    info: {
      message: data.message,
      imageUrl: `${apiBaseUrl}${data.preprocessed_image_url}`,
    },
  };
}

export async function detectImage(apiBaseUrl, imageId) {
  const response = await fetch(`${apiBaseUrl}/api/detect/${imageId}`, {
    method: "POST",
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data.detail || "AI detection failed");
  return data;
}