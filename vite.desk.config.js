// Bản xem thử (sửa chỉ trong trình duyệt): VITE_DESK_DEMO=1 npx vite build -c vite.desk.config.js  (ra thư mục dist-desk)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist-desk', target: 'es2022', rollupOptions: { input: { index: resolve(__dirname, 'index.html') } } },
});
