const fallbackOrigin = 'https://homemade.invalid';

export const safeReturnTo = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || /^\/[\\/]/.test(value) || /[\u0000-\u001f\u007f\\]/.test(value)) {
    return '/';
  }

  const destination = new URL(value, fallbackOrigin);
  if (destination.origin !== fallbackOrigin || /^\/[\\/]/.test(destination.pathname)) return '/';
  return `${destination.pathname}${destination.search}${destination.hash}`;
};
