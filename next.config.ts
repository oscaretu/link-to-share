import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    'metascraper',
    'metascraper-title',
    'metascraper-description',
    'metascraper-image',
    'metascraper-url',
    'metascraper-author',
    '@metascraper/helpers',
    'cheerio',
    'normalize-url',
  ],
};

export default nextConfig;
