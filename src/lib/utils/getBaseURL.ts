/**
 * Get the base URL for API requests
 * Handles different environments: production, client-side, and SSR/build time
 */
export const getBaseURL = () => {
  // Use NEXT_PUBLIC_APP_URL in production
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback to window.location.origin for client-side
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Fallback for SSR/build time - will be overridden on client
  return "http://localhost:5050";
};
