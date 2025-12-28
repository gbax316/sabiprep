/**
 * Fetch with retry logic and timeout
 * Helper function for admin API calls with automatic retry on timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  retries = 2
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err: any) {
      lastError = err as Error;
      
      // Only retry on timeout (AbortError), not on other errors
      if (err.name !== 'AbortError' || attempt === retries) {
        throw err;
      }
      
      // Wait 1 second before retry (exponential backoff could be added)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

