// Tuning knobs that are decisions, not environment: they must be identical in
// every deployment. Anything that legitimately changes per environment (the
// secret, the token lifetime) lives in the environment instead.
export const AUTH_CONFIG = Object.freeze({
  // 10 rounds is the bcrypt default: expensive enough to matter, cheap enough
  // that login stays under ~100ms.
  bcryptRounds: 10,
  // Cap on the password length. bcrypt silently truncates past 72 bytes, so
  // accepting more would create passwords that differ but authenticate alike.
  maxPasswordBytes: 72,
  minPasswordLength: 8,
});
