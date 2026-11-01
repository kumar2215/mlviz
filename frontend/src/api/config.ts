/**
 * API Configuration
 * Central configuration for API endpoints
 */

/**
 * Base URL for all API requests.
 * - Development: Empty string (uses Vite proxy to localhost:8000)
 * - Production: Full GCP backend URL
 */
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "";
