import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevents this site from being embedded in an iframe on
          // another domain - the standard defense against clickjacking.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops the browser from guessing content types, which can
          // otherwise be tricked into executing something unintended.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Forces HTTPS for a year, including subdomains, once a
          // browser has seen this header once.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Limits how much referrer info leaks to other sites when
          // someone navigates away from this one.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;