// Rate limit for the credential endpoints. Register and login are the only
// routes where guessing pays off, so they are the only ones throttled — the
// rest are already gated by a token.
export const THROTTLE_CONFIG = Object.freeze({
  ttlMs: 60_000,
  limit: 10,
});
