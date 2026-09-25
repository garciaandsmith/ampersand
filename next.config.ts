import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static locates its binary relative to its own package folder, so it must
  // stay a real node_modules import instead of being bundled into the server build.
  serverExternalPackages: ["ffmpeg-static"],
  // Vercel only ships files it can trace from imports; the binary is spawned, not
  // imported, so pages whose server actions transcribe audio must include it explicitly.
  outputFileTracingIncludes: {
    "/projects/*/archive/**": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
