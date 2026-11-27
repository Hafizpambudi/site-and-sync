export type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
};

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

/**
 * Only transport-level failures are worth repeating. A 400 or 401 will fail the
 * same way forever, so retrying it just burns the rate-limit budget.
 */
function isRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return true;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return RETRYABLE_STATUS.has(status);
  return true;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 400,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}