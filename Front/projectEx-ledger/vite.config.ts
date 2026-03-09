import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // A님이 추가하신 테일윈드

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 필수 설정 유지
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080", // 스프링 부트 서버 주소
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
