/**
 * Google OAuth Web Client ID (public — embedded in the browser bundle).
 * Set VITE_GOOGLE_CLIENT_ID in .env to override for a different environment.
 */
export const GOOGLE_OAUTH_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '392719147746-htpi2dg4gr5sn76sef30objnc7svj7he.apps.googleusercontent.com';
