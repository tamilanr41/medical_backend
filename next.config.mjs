/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  experimental: {
    // The project lives under OneDrive, whose file locking/sync corrupts
    // Turbopack's RocksDB persistent cache ("Failed to open database /
    // Loading persistence directory failed / invalid digit found in string").
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
