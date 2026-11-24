/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return ['/auth/verify-email', '/auth/magic-link'].map((source) => ({
      source,
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    }));
  },
};

module.exports = nextConfig;
