import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // nếu dùng images remote, thêm domains ở đây
  // images: { domains: ["..."] },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd, // dev tắt, prod bật
})(nextConfig);
