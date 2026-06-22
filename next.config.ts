import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (and its pdfjs dependency) must stay external — don't bundle it
  // into the server build.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
