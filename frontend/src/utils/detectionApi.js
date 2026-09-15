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

export async function batchPreprocess(apiBaseUrl, imageFiles, xmlFiles) {
  const formData = new FormData();
  imageFiles.forEach((file) => formData.append("images", file));
  xmlFiles.forEach((file) => formData.append("xml_files", file));

  const response = await fetch(`${apiBaseUrl}/api/preprocess/batch`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data.detail || "Batch preprocessing failed");
  return data;
}

export async function batchDetect(apiBaseUrl, imageIds, onProgress) {
  const results = [];

  for (let index = 0; index < imageIds.length; index += 1) {
    try {
      const data = await detectImage(apiBaseUrl, imageIds[index]);
      const progress = { status: "success", data };
      results.push(progress);
      onProgress?.(index + 1, imageIds.length, progress);
    } catch (error) {
      const progress = { status: "error", error: error.message };
      results.push(progress);
      onProgress?.(index + 1, imageIds.length, progress);
    }
  }

  return results;
}
