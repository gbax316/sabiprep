/**
 * Admin API Utilities
 * Provides timeout-protected fetch functions for admin pages
 */

const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Fetch with timeout and error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Fetch JSON with timeout
 */
export async function fetchJSON<T>(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const response = await fetchWithTimeout(url, options, timeout);
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - Please log in again');
    }
    if (response.status === 403) {
      throw new Error('Forbidden - You do not have permission');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

