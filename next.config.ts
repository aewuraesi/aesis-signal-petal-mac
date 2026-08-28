import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Base44 preview's external origin to load dev assets/HMR.
  // The preview hostname is "<port>-<BASE44_PUBLIC_HOST_SUFFIX>"; without this,
  // vinext's dev origin check blocks the RSC client entry and hydration stalls.
  allowedDevOrigins: process.env.BASE44_PUBLIC_HOST_SUFFIX
    ? [`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`]
    : [],
};

export default nextConfig;
