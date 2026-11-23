export const authDebugLinksEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEBUG_LINKS === 'true';
