export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const AI_API_BASE_URL = process.env.REACT_APP_AI_BACKEND_URL || "http://localhost:8000";

export const apiUrl = (baseUrl, path) => `${baseUrl}${path}`;