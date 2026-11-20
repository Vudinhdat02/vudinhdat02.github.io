import React from 'react';

/*
 * Chống "trang trắng" sau mỗi lần cập nhật web:
 * GitHub Pages giữ index.html trong bộ nhớ đệm vài phút, còn các file JS cũ (tên có mã băm) thì bị xoá khi đăng bản mới.
 * Một tab đang mở (hoặc index.html cũ) sẽ gọi tới file đã mất → lỗi tải module → cả trang trắng.
 *  1. Lỗi tải file JS / CSS (vite:preloadError hoặc lỗi import động): tự tải lại trang MỘT lần để lấy bản mới.
 *  2. Lỗi khác khi hiển thị: không trắng trang, hiện thông báo kèm nút "Tải lại trang".
 */
const RELOAD_KEY = 'desk.reloadedAt';
const isChunkError = (err) => /dynamically imported module|Failed to fetch|Importing a module script failed|error loading dynamically|Loading chunk|preload/i.test(String(err?.message || err || ''));
function reloadOnce() {
  let last = 0;
  try { last = +sessionStorage.getItem(RELOAD_KEY) || 0; } catch { /* bỏ qua */ }
  if (Date.now() - last < 30000) return false; // vừa tải lại rồi mà vẫn lỗi thì thôi, tránh lặp vô hạn
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* bỏ qua */ }
  window.location.reload();
  return true;
}
export function installReloadGuard() {
  window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });
  window.addEventListener('unhandledrejection', (e) => { if (isChunkError(e.reason)) reloadOnce(); });
}

export class Guard extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { if (isChunkError(err)) reloadOnce(); }
  render() {
    if (!this.state.err) return this.props.children;
    if (this.props.inline) return <div style={{ padding: '80px 20px', textAlign: 'center', color: '#1f2f6e' }}><p style={{ fontSize: '2.4rem', margin: 0 }}>🛠️</p><p>Phần này chưa hiện được. <button type="button" onClick={() => window.location.reload()} style={{ padding: '6px 14px', borderRadius: 8, border: 0, background: '#1f2f6e', color: '#fff', cursor: 'pointer' }}>Tải lại trang</button></p></div>;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f7fc', color: '#1f2f6e', textAlign: 'center', fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}>
        <div>
          <p style={{ fontSize: '3rem', margin: 0 }}>🛠️</p>
          <h1 style={{ fontSize: '1.4rem', margin: '12px 0 6px' }}>Trang vừa được cập nhật</h1>
          <p style={{ margin: '0 0 18px', color: '#4a5a96' }}>Bấm nút dưới đây để tải bản mới nhất nhé.</p>
          <button type="button" onClick={() => { try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* bỏ qua */ } window.location.reload(); }}
            style={{ padding: '10px 22px', borderRadius: 10, border: 0, background: '#1f2f6e', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>Tải lại trang</button>
        </div>
      </div>
    );
  }
}

