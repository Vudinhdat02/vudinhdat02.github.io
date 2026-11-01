/* Logo thật của từng nền tảng (vẽ bằng SVG, tự mang màu) */
const TT = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
const GH = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
const PH = 'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z';

export const BRAND_COLOR = { github: '#181717', facebook: '#1877F2', youtube: '#FF0000', tiktok: '#000000', instagram: '#E1306C', mail: '#EA4335', call: '#34C759' };

export default function BrandIcon({ kind, className = '' }) {
  const p = { className: `brand ${className}`, viewBox: '0 0 24 24', 'aria-hidden': true };
  switch (kind) {
    case 'github':
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#181717" /><g transform="translate(5.2 5.2) scale(.567)"><path d={GH} fill="#fff" /></g></svg>;
    case 'facebook':
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#1877F2" /><path d="M13.4 24v-8.6h2.9l.45-3.4H13.4V9.85c0-.98.28-1.65 1.68-1.65h1.8V5.17c-.31-.04-1.38-.13-2.62-.13-2.6 0-4.37 1.58-4.37 4.49V12H7v3.4h2.89V24z" fill="#fff" /></svg>;
    case 'youtube':
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#FF0000" /><rect x="5.2" y="7.6" width="13.6" height="8.8" rx="2.6" fill="#fff" /><path d="M10.6 9.9 L14.3 12 L10.6 14.1 Z" fill="#FF0000" /></svg>;
    case 'tiktok':
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#010101" /><g transform="translate(6.6 6.2) scale(.48)"><path d={TT} fill="#25F4EE" transform="translate(-1.2 -1)" /><path d={TT} fill="#FE2C55" transform="translate(1.2 1)" /><path d={TT} fill="#fff" /></g></svg>;
    case 'instagram':
      return (
        <svg {...p}>
          <defs><radialGradient id="igg" cx="0.3" cy="1.07" r="1.2"><stop offset="0" stopColor="#feda75" /><stop offset="0.25" stopColor="#fa7e1e" /><stop offset="0.5" stopColor="#d62976" /><stop offset="0.75" stopColor="#962fbf" /><stop offset="1" stopColor="#4f5bd5" /></radialGradient></defs>
          <circle cx="12" cy="12" r="12" fill="url(#igg)" />
          <rect x="6.6" y="6.6" width="10.8" height="10.8" rx="3.3" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.6" fill="none" stroke="#fff" strokeWidth="1.5" /><circle cx="15.3" cy="8.7" r=".85" fill="#fff" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="11.5" fill="#fff" stroke="#e3e6ec" />
          <path d="M5.6 8.6 V16 a1 1 0 0 0 1 1 H8.2 V10.8 Z" fill="#4285F4" /><path d="M18.4 8.6 V16 a1 1 0 0 1 -1 1 H15.8 V10.8 Z" fill="#34A853" />
          <path d="M5.9 8.3 L12 12.8 L18.1 8.3" fill="none" stroke="#EA4335" strokeWidth="2" strokeLinejoin="round" /><path d="M15.8 10.1 L18.1 8.3 V9.3" fill="none" stroke="#FBBC04" strokeWidth="2" />
        </svg>
      );
    case 'call':
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#34C759" /><g transform="translate(5.4 5.4) scale(.55)"><path d={PH} fill="#fff" /></g></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="12" fill="#1f2f6e" /></svg>;
  }
}
