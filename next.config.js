const withVideos = require('next-videos');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // This is needed for react-player and ffmpeg to work properly
    config.resolve.alias.fs = false;
    config.resolve.alias.path = false;
    config.resolve.alias.os = false;

    // Required for ffmpeg WASM
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
  // Additional configuration for enhanced video support
  experimental: {
    // Future experimental features can be added here
  },
};

module.exports = withVideos(nextConfig);
