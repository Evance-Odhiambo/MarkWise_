import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.42", "localhost"],
  output: "standalone",
};

export default nextConfig;
