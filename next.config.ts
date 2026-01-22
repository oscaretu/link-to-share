import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['re2', 'metascraper', 'metascraper-title', 'metascraper-description', 'metascraper-image', 'metascraper-url', 'metascraper-author'],
};

export default nextConfig;
