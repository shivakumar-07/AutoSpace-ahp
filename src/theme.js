export const T = {
  bg: "#0A0F1D",
  surface: "#121B2F",
  card: "#1A253D",
  cardHover: "#23314F",
  border: "#2A3B59",
  borderHi: "#3B5075",
  amber: "#F59E0B",
  amberDim: "#92400E",
  amberGlow: "rgba(245,158,11,0.12)",
  amberSoft: "rgba(245,158,11,0.06)",
  emerald: "#10B981",
  emeraldDim: "#065F46",
  emeraldBg: "rgba(16,185,129,0.1)",
  crimson: "#EF4444",
  crimsonDim: "#7F1D1D",
  crimsonBg: "rgba(239,68,68,0.1)",
  sky: "#38BDF8",
  skyDim: "#0C4A6E",
  skyBg: "rgba(56,189,248,0.1)",
  violet: "#A78BFA",
  violetBg: "rgba(167,139,250,0.1)",
  t1: "#F0F4F8",
  t2: "#94A3B8",
  t3: "#64748B",
  t4: "#334155",
};

export const FONT = {
  ui: "'Outfit', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${T.bg}; color: ${T.t1}; font-family: ${FONT.ui}; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${T.borderHi}; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input::placeholder, textarea::placeholder { color: ${T.t3}; }
  select option { background: ${T.card}; color: ${T.t1}; }
  * { -webkit-tap-highlight-color: transparent; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes fadeOut  { from { opacity:1; } to { opacity:0; } }
  @keyframes slideRight { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
  @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes shimmer  { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
  @keyframes scaleOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(0.96); } }
  @keyframes toastSlide { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
  @keyframes toastSlideOut { from { opacity:1; transform:none; } to { opacity:0; transform:translateX(30px); } }
  @keyframes spinOnce { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes slideInRight { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
  @keyframes backdropIn { from { backdrop-filter: blur(0px); background: rgba(5,8,13,0); } to { backdrop-filter: blur(6px); background: rgba(5,8,13,0.75); } }
  @keyframes tickRoll { from { transform: translateY(-100%); opacity:0; } to { transform: translateY(0); opacity:1; } }
  @keyframes tickRollOut { from { transform: translateY(0); opacity:1; } to { transform: translateY(100%); opacity:0; } }
  @keyframes btnPress { 0% { transform: scale(1); } 50% { transform: scale(0.96); } 100% { transform: scale(1); } }
  @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(4); opacity: 0; } }
  @keyframes progressShrink { from { width: 100%; } to { width: 0%; } }
  @keyframes bellShake { 0%,100% { transform: rotate(0); } 15% { transform: rotate(14deg); } 30% { transform: rotate(-14deg); } 45% { transform: rotate(10deg); } 60% { transform: rotate(-6deg); } 75% { transform: rotate(2deg); } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes borderGlow { 0%,100% { border-color: ${T.border}; } 50% { border-color: ${T.borderHi}; } }

  .page-in  { animation: fadeUp 0.22s ease both; }
  .modal-in { animation: scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-out { animation: scaleOut 0.15s ease both; }
  .backdrop-in { animation: backdropIn 0.2s ease both; }
  .toast-in { animation: toastSlide 0.25s cubic-bezier(0.16,1,0.3,1) both; }
  .toast-out { animation: toastSlideOut 0.2s ease both; }
  .row-hover:hover { background: ${T.cardHover} !important; transition: background 0.1s; }
  .nav-item { transition: all 0.15s; }
  .nav-item:hover:not(.nav-active) { background: ${T.amberGlow} !important; color: ${T.amber} !important; }
  .btn-hover { transition: all 0.15s; }
  .btn-hover:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .btn-hover:active:not(:disabled) { transform: translateY(0); animation: btnPress 0.15s ease; }
  .card-hover { transition: border-color 0.15s, box-shadow 0.15s, transform 0.2s; }
  .card-hover:hover { border-color: ${T.borderHi} !important; box-shadow: 0 0 0 1px ${T.borderHi} !important; transform: translateY(-1px); }

  .glow-amber { box-shadow: 0 0 20px rgba(245,158,11,0.2), 0 0 40px rgba(245,158,11,0.05); }
  .glow-emerald { box-shadow: 0 0 20px rgba(16,185,129,0.15); }
  .glow-crimson { box-shadow: 0 0 20px rgba(239,68,68,0.15); }
  .glow-sky { box-shadow: 0 0 20px rgba(56,189,248,0.15); }
  .fade-in { animation: fadeIn 0.2s ease both; }
  .btn-hover-subtle { transition: background 0.15s, color 0.15s; }
  .btn-hover-subtle:hover { background: ${T.amberGlow} !important; color: ${T.amber} !important; }

  .tick-roll { animation: tickRoll 0.35s cubic-bezier(0.16,1,0.3,1) both; overflow: hidden; display: inline-block; }
  .float-anim { animation: float 3s ease-in-out infinite; }
  .bell-shake { animation: bellShake 0.6s ease; }
  .mono-figure { font-family: ${FONT.mono}; font-variant-numeric: tabular-nums; }
  .aging-segment:hover .aging-tooltip { visibility: visible !important; opacity: 1 !important; }
`;
