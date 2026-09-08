const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const rawAiBackendUrl = process.env.REACT_APP_AI_BACKEND_URL || rawBackendUrl;

export const API_BASE_URL = rawBackendUrl.replace(/\/$/, "");
export const AI_API_BASE_URL = rawAiBackendUrl.replace(/\/$/, "");

export const apiUrl = (baseUrl, path) => `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;