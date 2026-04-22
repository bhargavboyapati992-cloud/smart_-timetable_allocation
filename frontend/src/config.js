/**
 * Centralized API configuration for VIMS Timetable Portal.
 * Returns the current API URL from localStorage, falling back to environment or default.
 */
export const getApiUrl = () => {
  return 'https://factor-driven-kooky.ngrok-free.dev';
};

export const API_URL = getApiUrl();
