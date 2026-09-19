export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;
export const AI_API_BASE_URL = process.env.REACT_APP_AI_BACKEND_URL;

export const apiUrl = (baseUrl, path) => `${baseUrl}${path}`;