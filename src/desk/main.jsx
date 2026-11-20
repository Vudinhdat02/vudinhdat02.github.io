import React from 'react';
import ReactDOM from 'react-dom/client';
import DeskApp from './DeskApp.jsx';
import { Guard, installReloadGuard } from './Guard.jsx';

/* chống trang trắng sau khi cập nhật web: xem Guard.jsx */
installReloadGuard();
ReactDOM.createRoot(document.getElementById('root')).render(<Guard><DeskApp /></Guard>);
