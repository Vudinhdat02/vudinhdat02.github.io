/*
 * Đồ chơi ở trang "Góc vui":
 *  - Terminal: gõ lệnh để khám phá (help, whoami, projects, open du-an, sudo hire-dat, matrix…)
 *  - Thi gõ phím: 30 giây, tính WPM + độ chính xác, lưu kỷ lục trong trình duyệt
 *  - Góc học bài: đồng hồ Pomodoro lật số + tiếng mưa / tiếng gõ phím nền
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import projects from '../../data/projects.json';
import achievements from '../../data/achievements.json';
import skills from '../../data/skills.json';
import { profile } from '../../data/profile';
import { thock, chime, rain, pop } from '../sound';
import { vi } from '../Diary';

const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } } };

/* ======================= TERMINAL ======================= */
export function Terminal({ onOpen, onNight }) {
  const [lines, setLines] = useState([{ t: 'sys', s: 'ĐẠT-OS 4.0 · gõ "help" để xem các lệnh. Phím Tab để tự hoàn thành, ↑ ↓ để xem lại lệnh cũ.' }]);
  const [cmd, setCmd] = useState('');
  const hist = useRef([]); const hi = useRef(-1);
  const box = useRef(null); const input = useRef(null);
  const [matrix, setMatrix] = useState(false);
  useEffect(() => { box.current.scrollTop = box.current.scrollHeight; }, [lines]);

  const CMDS = {
    help: () => ['Các lệnh:', '  whoami         · mình là ai', '  about          · giới thiệu ngắn', '  projects       · danh sách dự án', '  achievements   · thành tích', '  skills         · kỹ năng', '  open <trang>   · mở trang: home, du-an, thanh-tich, nhat-ky, cv, lien-he', '  contact        · cách liên hệ', '  lamp           · tắt / bật đèn', '  date           · hôm nay là ngày mấy', '  coffee         · pha cà phê', '  matrix         · ???', '  sudo hire-dat  · thử xem', '  clear          · xoá màn hình'],
    whoami: () => [`${profile.name} (${profile.codename}) — ${profile.role.vi}`, `📍 ${vi(profile.location)}`],
    about: () => [vi(profile.bio)],
    projects: () => projects.map((p, i) => `  ${String(i + 1).padStart(2, '0')}. [${p.category}] ${p.title} — ${p.tags.slice(0, 3).join(', ')}`),
    achievements: () => achievements.map((a) => `  🏅 ${a.date.padEnd(12)} ${a.title}`),
    skills: () => skills.map((s) => `  ${s.name.padEnd(12)} ${s.desc}`),
    contact: () => profile.socials.map((s) => `  ${String(vi(s.label)).padEnd(12)} ${s.handle}`),
    date: () => [new Date().toLocaleString('vi-VN')],
    coffee: () => ['      ( (', '       ) )', '    ........', '    |      |]', '    \\      /', '     `----\'', 'Cà phê đã sẵn sàng ☕ — năng suất +200%'],
    lamp: () => { onNight(); return ['💡 Đã đổi đèn.']; },
    'sudo': (a) => (a[0] === 'hire-dat' ? ['[sudo] mật khẩu cho khách: ********', '✔ Quyền được cấp. Đang gửi lời mời tới Đạt…', `✉ Liên hệ ngay: ${profile.email}`, '🎉 Cảm ơn bạn đã tin tưởng!'] : ['sudo: chỉ chấp nhận "sudo hire-dat" 😉']),
    open: (a) => { const ok = ['home', 'du-an', 'thanh-tich', 'nhat-ky', 'cv', 'lien-he'].includes(a[0]); if (ok) setTimeout(() => onOpen(a[0] === 'home' ? '' : a[0]), 400); return [ok ? `Đang mở ${a[0]}…` : 'Dùng: open home | du-an | thanh-tich | nhat-ky | cv | lien-he']; },
    matrix: () => { setMatrix(true); setTimeout(() => setMatrix(false), 4200); return ['Wake up, Neo… 🐇']; },
    clear: () => null,
  };
  const run = (raw) => {
    const s = raw.trim(); if (!s) return;
    hist.current.unshift(s); hi.current = -1;
    const [c, ...args] = s.split(/\s+/);
    if (c === 'clear') { setLines([]); return; }
    const out = CMDS[c.toLowerCase()] ? CMDS[c.toLowerCase()](args) : [`không tìm thấy lệnh: ${c} — gõ "help"`];
    setLines((l) => [...l, { t: 'in', s }, ...(out || []).map((x) => ({ t: 'out', s: x }))]);
  };
  const onKey = (e) => {
    thock(1.5);
    if (e.key === 'Enter') { run(cmd); setCmd(''); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hi.current = Math.min(hist.current.length - 1, hi.current + 1); setCmd(hist.current[hi.current] || ''); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi.current = Math.max(-1, hi.current - 1); setCmd(hi.current < 0 ? '' : hist.current[hi.current]); }
    else if (e.key === 'Tab') { e.preventDefault(); const m = [...Object.keys(CMDS), 'open du-an', 'open thanh-tich', 'open nhat-ky', 'sudo hire-dat'].find((k) => k.startsWith(cmd)); if (m) setCmd(m); }
  };
  return (
    <div className="term" onClick={() => input.current?.focus()}>
      {matrix && <MatrixRain />}
      <div className="term-out" ref={box}>
        {lines.map((l, i) => <pre key={i} className={`tl-${l.t}`}>{l.t === 'in' ? `dat@ban-hoc ~ % ${l.s}` : l.s}</pre>)}
        <div className="term-in"><span>dat@ban-hoc ~ %</span><input ref={input} value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={onKey} spellCheck={false} aria-label="Lệnh" /></div>
      </div>
    </div>
  );
}

function MatrixRain() {
  const cv = useRef(null);
  useEffect(() => {
    const c = cv.current, g = c.getContext('2d');
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const cols = Math.floor(c.width / 14), drops = Array(cols).fill(0).map(() => Math.random() * -40);
    const chars = 'ĐẠTVŨĐÌNH01アイウエオIOT{}<>';
    const id = setInterval(() => {
      g.fillStyle = 'rgba(5,15,8,0.12)'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#59ff8a'; g.font = '14px VT323, monospace';
      drops.forEach((y, i) => { g.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14); drops[i] = y * 14 > c.height && Math.random() > 0.96 ? 0 : y + 1; });
    }, 45);
    return () => clearInterval(id);
  }, []);
  return <canvas ref={cv} className="matrix" />;
}

/* ======================= THI GÕ PHÍM ======================= */
const WORDS = 'react esp32 kotlin firmware sensor api backend wifi mqtt arduino android github deploy debug server cloud docker linux router python java widget layout pixel byte bit chip pcb uart spi i2c gpio stm32 drone camera socket json render state hook commit merge branch cache thread kernel compile vite gsap flutter dotnet sql firebase token login sinh viên đồ án học bổng thầy cô bạn bè thư viện giảng đường cà phê bàn phím màn hình chuột vở bút mực điểm mười'.split(' ');
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

export function TypeRace() {
  const [words, setWords] = useState(() => shuffle(WORDS).slice(0, 60));
  const [wi, setWi] = useState(0);
  const [typed, setTyped] = useState('');
  const [res, setRes] = useState([]); // true/false từng từ
  const [left, setLeft] = useState(30);
  const [state, setState] = useState('idle'); // idle | run | done
  const [best, setBest] = useState(() => store.get('desk.wpm', 0));
  const keysRef = useRef(null); const ref = useRef(null); const input = useRef(null);
  const chars = useRef({ ok: 0, all: 0 });

  useEffect(() => {
    if (state !== 'run') return undefined;
    const t = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(t); setState('done'); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [state]);
  const wpm = Math.round((chars.current.ok / 5) / 0.5);
  const acc = chars.current.all ? Math.round((chars.current.ok / chars.current.all) * 100) : 100;
  useEffect(() => {
    if (state !== 'done') return;
    chime(true);
    if (wpm > best) { setBest(wpm); store.set('desk.wpm', wpm); }
    gsap.fromTo(ref.current.querySelector('.tr-result'), { scale: 0.4, rotate: -10, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.8)' });
    gsap.fromTo(ref.current.querySelector('.tr-stamp'), { scale: 3, opacity: 0, rotate: -40 }, { scale: 1, opacity: 0.9, rotate: -12, delay: 0.5, duration: 0.3, ease: 'power4.in' });
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => { setWords(shuffle(WORDS).slice(0, 60)); setWi(0); setTyped(''); setRes([]); setLeft(30); setState('idle'); chars.current = { ok: 0, all: 0 }; setTimeout(() => input.current?.focus(), 50); };
  const flash = (k) => {
    const el = keysRef.current?.querySelector(`[data-k="${k}"]`);
    if (el) gsap.fromTo(el, { y: 3, backgroundColor: '#f3a64a' }, { y: 0, backgroundColor: '#ece4cf', duration: 0.25 });
  };
  const onChange = (e) => {
    if (state === 'done') return;
    if (state === 'idle') setState('run');
    const v = e.target.value;
    const last = v.slice(-1).toLowerCase();
    thock(1 + Math.random() * 0.3); flash(last === ' ' ? 'space' : last);
    if (v.endsWith(' ')) {
      const w = v.trim(), ok = w === words[wi];
      chars.current.all += words[wi].length + 1; if (ok) chars.current.ok += words[wi].length + 1;
      setRes((r) => [...r, ok]); setWi((i) => i + 1); setTyped('');
      if (!ok) gsap.fromTo(ref.current.querySelector('.tr-words'), { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    setTyped(v);
  };
  const grade = wpm >= 60 ? 'XUẤT SẮC' : wpm >= 40 ? 'GIỎI' : wpm >= 25 ? 'KHÁ' : 'CỐ LÊN';
  return (
    <div className="tr" ref={ref} onClick={() => input.current?.focus()}>
      <div className="tr-top"><span>⏱ <b>{left}</b>s</span><span>Kỷ lục: <b>{best}</b> WPM</span><button onClick={restart}>↻ Làm lại</button></div>
      {state !== 'done' ? (
        <>
          <div className="tr-words">
            {words.slice(Math.max(0, wi - 6), wi + 22).map((w, j) => {
              const idx = Math.max(0, wi - 6) + j;
              const cls = idx < wi ? (res[idx] ? 'ok' : 'bad') : idx === wi ? (w.startsWith(typed) ? 'cur' : 'cur wrong') : '';
              return <span key={idx} className={cls}>{w}</span>;
            })}
          </div>
          <input ref={input} className="tr-in" value={typed} onChange={onChange} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={state === 'idle' ? 'Bắt đầu gõ để tính giờ…' : ''} aria-label="Gõ ở đây" />
        </>
      ) : (
        <div className="tr-result">
          <p><b>{wpm}</b> từ / phút</p><p>Chính xác {acc}% · {res.filter(Boolean).length} từ đúng</p>
          <span className="tr-stamp">{grade}</span>
          <button onClick={restart}>Thử lại ↻</button>
        </div>
      )}
      <div className="tr-kb" ref={keysRef}>
        {['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].map((r) => <div key={r}>{[...r].map((k) => <span key={k} data-k={k}>{k}</span>)}</div>)}
        <div><span data-k="space" className="sp">space</span></div>
      </div>
    </div>
  );
}

/* ======================= GÓC HỌC BÀI ======================= */
const pad = (n) => String(n).padStart(2, '0');
function Flip2({ v }) {
  const ref = useRef(null); const prev = useRef(v);
  useLayoutEffect(() => {
    if (prev.current === v) return;
    gsap.fromTo(ref.current, { rotateX: -90, opacity: 0.4 }, { rotateX: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' });
    prev.current = v;
  }, [v]);
  return <span className="fc"><span ref={ref}>{v}</span></span>;
}
export function Focus() {
  const [mode, setMode] = useState('hoc'); // hoc | nghi
  const [sec, setSec] = useState(25 * 60);
  const [run, setRun] = useState(false);
  const [rainOn, setRainOn] = useState(false);
  const [keys, setKeys] = useState(false);
  const [done, setDone] = useState(() => store.get('desk.pomo', 0));
  useEffect(() => {
    if (!run) return undefined;
    const t = setInterval(() => setSec((s) => {
      if (s > 1) return s - 1;
      chime(true);
      if (mode === 'hoc') { setDone((d) => { store.set('desk.pomo', d + 1); return d + 1; }); setMode('nghi'); return 5 * 60; }
      setMode('hoc'); return 25 * 60;
    }), 1000);
    return () => clearInterval(t);
  }, [run, mode]);
  useEffect(() => () => rain(false), []);
  useEffect(() => {
    if (!keys) return undefined;
    let t; const tick = () => { thock(0.8 + Math.random() * 0.6); t = setTimeout(tick, 80 + Math.random() * (Math.random() < 0.1 ? 900 : 180)); };
    tick(); return () => clearTimeout(t);
  }, [keys]);
  const total = mode === 'hoc' ? 25 * 60 : 5 * 60;
  const m = pad(Math.floor(sec / 60)), s = pad(sec % 60);
  return (
    <div className={`focus ${mode}`}>
      <div className="seg center">
        <button className={mode === 'hoc' ? 'on' : ''} onClick={() => { setMode('hoc'); setSec(25 * 60); setRun(false); }}>📚 Học 25'</button>
        <button className={mode === 'nghi' ? 'on' : ''} onClick={() => { setMode('nghi'); setSec(5 * 60); setRun(false); }}>☕ Nghỉ 5'</button>
      </div>
      <div className="fc-row"><Flip2 v={m[0]} /><Flip2 v={m[1]} /><b>:</b><Flip2 v={s[0]} /><Flip2 v={s[1]} /></div>
      <div className="fc-bar"><i style={{ width: `${(1 - sec / total) * 100}%` }} /></div>
      <div className="fc-btns">
        <button className="go" onClick={() => { setRun(!run); pop(); }}>{run ? '⏸ Tạm dừng' : '▶ Bắt đầu'}</button>
        <button onClick={() => { setRun(false); setSec(total); }}>↺</button>
      </div>
      <p className="fc-label">Âm thanh nền</p>
      <div className="fc-amb">
        <button className={rainOn ? 'on' : ''} onClick={() => { rain(!rainOn); setRainOn(!rainOn); }}>🌧 Mưa</button>
        <button className={keys ? 'on' : ''} onClick={() => setKeys(!keys)}>⌨ Gõ phím</button>
      </div>
      <p className="fc-done">Đã hoàn thành <b>{done}</b> phiên học {'🍅'.repeat(Math.min(done, 8))}</p>
      {rainOn && <div className="raindrops" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.13) % 1.2}s`, animationDuration: `${0.6 + ((i * 7) % 5) / 10}s` }} />)}</div>}
    </div>
  );
}
