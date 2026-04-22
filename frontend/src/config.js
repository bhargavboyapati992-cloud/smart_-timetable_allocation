/**
 * Centralized API configuration for VIMS Timetable Portal.
 * Returns the current API URL from localStorage, falling back to environment or default.
 */
export const getApiUrl = () => {
  const saved = localStorage.getItem('vims_api_url');
  
  // If we have a saved URL, use it UNLESS it's an old Cloudflare link
  if (saved && !saved.includes('trycloudflare.com')) {
    return saved;
  }

  const url = import.meta.env.VITE_API_URL || 'https://factor-driven-kooky.ngrok-free.dev';
  console.log('VIMS System: Using API Engine at', saved && !saved.includes('trycloudflare.com') ? saved : url);
  
  // Fallback to environment or the new Permanent Ngrok link
  return (
    import.meta.env.VITE_API_URL || 
    'https://factor-driven-kooky.ngrok-free.dev'
  );
};

export const API_URL = getApiUrl(); // For static access (caution: won't update without refresh)
