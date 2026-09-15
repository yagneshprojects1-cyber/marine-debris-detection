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

/**
 * Send all images + XMLs to POST /api/preprocess/batch in one request.
 * The backend matches pairs by filename stem (00001.bmp ↔ 00001.xml).
 *
 * @returns {Promise<{total, accepted, rejected, items}>}
 */
export async function batchPreprocess(apiBaseUrl, imageFiles, xmlFiles) {
  const formData = new FormData();
  imageFiles.forEach((f) => formData.append("images", f));
  xmlFiles.forEach((f) => formData.append("xml_files", f));

  const response = await fetch(`${apiBaseUrl}/api/preprocess/batch`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();

  if (!response.ok) throw new Error(data.detail || "Batch preprocessing failed");
  return data;
}

/**
 * Run detection for every successfully preprocessed image, one at a time.
 * Calls onProgress(index, total, result | error) after each finishes so the
 * UI can update incrementally.
 *
 * @param {string} apiBaseUrl
 * @param {string[]} imageIds  - list of image_id strings from batchPreprocess
 * @param {function} onProgress
 * @returns {Promise<Array>} array of DetectionResponse objects (or Error objects for failures)
 */
export async function batchDetect(apiBaseUrl, imageIds, onProgress) {
  const results = [];
  for (let i = 0; i < imageIds.length; i++) {
    try {
      const result = await detectImage(apiBaseUrl, imageIds[i]);
      results.push({ status: "success", data: result });
      if (onProgress) onProgress(i + 1, imageIds.length, { status: "success", data: result });
    } catch (err) {
      results.push({ status: "error", error: err.message });
      if (onProgress) onProgress(i + 1, imageIds.length, { status: "error", error: err.message });
    }
  }
  return results;
}