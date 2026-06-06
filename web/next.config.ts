import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Include vocab cache files in the serverless function bundle
  // so /api/vocab and /api/vocab/pronunciation can read them at runtime on Netlify.
  outputFileTracingRoot: path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/api/vocab": ["../data/api/vocab/word-cache.json", "../data/api/vocab/cache.json"],
    "/api/vocab/pronunciation": ["../data/api/vocab/pronunciation-cache.json"],
    "/api/listening-audio/[file]": ["../data/normalized-listening/**", "../data/listening-audio/**"],
    "/api/listening/audio/[file]": ["../data/normalized-listening/**", "../data/listening-audio/**"],
  },
};

export default nextConfig;
