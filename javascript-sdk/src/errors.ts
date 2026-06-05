// Base error

/** Thrown when SDK configuration is invalid (missing API key, bad options, etc.). */
export class CoseviConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoseviConfigError";
  }
}

// API errors

/** Thrown when the COSEVI/Junar API returns a non-success HTTP response. */
export class CoseviApiError extends Error {
  /** HTTP status code returned by the API, if available. */
  status?: number;
  /** Application error code, if the API provides one. */
  code?: string;
  /** Request URL with `auth_key` removed. Safe to log. */
  safeUrl?: string;
  /** Parsed JSON response body, if available. */
  responseBody?: unknown;

  constructor(message: string, status?: number, responseBody?: unknown, safeUrl?: string) {
    super(message);
    this.name = "CoseviApiError";
    this.status = status;
    this.responseBody = responseBody;
    this.safeUrl = safeUrl;
  }
}

// Auth errors

/** Thrown when the API returns a 401 Unauthorized response. */
export class CoseviAuthError extends CoseviApiError {
  constructor(message: string, status?: number, responseBody?: unknown, safeUrl?: string) {
    super(message, status, responseBody, safeUrl);
    this.name = "CoseviAuthError";
  }
}

// Rate limit errors

/** Thrown when the API returns a 429 Too Many Requests response and retries are exhausted. */
export class CoseviRateLimitError extends CoseviApiError {
  /** Value of the `Retry-After` header in seconds, if the API provided it. */
  retryAfterSeconds?: number;
  constructor(message: string, status?: number, responseBody?: unknown, safeUrl?: string, retryAfterSeconds?: number) {
    super(message, status, responseBody, safeUrl);
    this.name = "CoseviRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
