interface FetchOptions {
  headers?: Record<string, string>;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers } = options;

  const fetchInit: RequestInit = {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  let lastError: { status: number; message: string } | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, fetchInit);

      if (res.status === 429) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }

      if (res.status >= 500) {
        lastError = { status: res.status, message: `Server error: ${res.status}` };
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new ApiClientError(res.status, text);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      lastError = {
        status: 0,
        message: err instanceof Error ? err.message : 'Network error',
      };
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
      }
    }
  }

  throw new ApiClientError(
    lastError?.status ?? 0,
    lastError?.message ?? 'Request failed after retries'
  );
}

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
