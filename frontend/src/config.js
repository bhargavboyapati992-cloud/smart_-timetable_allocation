/**
 * Centralized API configuration for VIMS Timetable Portal.
 * Returns the current API URL from localStorage, falling back to environment or default.
 */
export const getApiUrl = () => {
  return (
    localStorage.getItem('vims_api_url') || 
    import.meta.env.VITE_API_URL || 
    'https://factor-driven-kooky.ngrok-free.dev'
  );
};

export const API_URL = getApiUrl(); // For static access (caution: won't update without refresh)
