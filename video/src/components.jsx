// ============================================================
//  Componentes compartidos del video: colores, tipografía,
//  canecas, íconos de residuos y utilidades de animación.
// ============================================================
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

// Tipografía Inter (la misma de la página web)
export const { fontFamily } = loadFont('normal', { weights: ['400', '500', '700', '900'], subsets: ['latin'] });

// Paleta de EcoSort (estilo Wise)
export const C = {
  forest: '#163300', lime: '#9FE870', spruce: '#054D28', linen: '#E2F6D5', fog: '#E8EBE6',
  paper: '#F7F9F4', white: '#FFFFFF', obsidian: '#0E0F0C', charcoal: '#454745', slate: '#6A6C6A',
  green: '#2F8F3A', red: '#CB272F', blue: '#0B4C72', yellow: '#F2C94C',
};

// Animación con rebote que empieza en el cuadro "delay"
export const usePop = (delay = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

// Valor que va de 0 a 1 entre dos cuadros, con suavizado
export const progress = (frame, start, end) =>
  interpolate(frame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

// Escena con fondo y desvanecimiento al entrar y al salir
export const Scene = ({ bg, dur, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, dur - 12, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: bg, fontFamily, opacity, overflow: 'hidden' }}>
      {children}
    </AbsoluteFill>
  );
};

// Texto que aparece subiendo y desvaneciéndose
export const Rise = ({ delay = 0, children, style }) => {
  const p = usePop(delay, 18);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style }}>{children}</div>
  );
};

// Texto que se escribe letra por letra
export const Typewriter = ({ text, start = 0, speed = 1.5, style }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - start) * speed));
  return <span style={style}>{text.slice(0, chars)}</span>;
};

// Número que cuenta desde 0 hasta "to"
export const Counter = ({ to, start = 0, duration = 60, decimals = 0, suffix = '', style }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + duration], [0, to], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const txt = v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span style={style}>{txt}{suffix}</span>;
};

// ---------- Íconos de línea (los mismos de la página) ----------
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
export const LeafIcon = ({ size = 48, color = C.forest, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...line, stroke: color, strokeWidth: w }}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);
export const RecycleIcon = ({ size = 48, color = C.blue, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...line, stroke: color, strokeWidth: w }}>
    <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
    <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
    <path d="m14 16-3 3 3 3" /><path d="M8.293 13.596 7.196 9.5 3.1 10.598" />
    <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" />
    <path d="m13.378 9.633 4.096 1.098 1.097-4.096" />
  </svg>
);
export const TrashIcon = ({ size = 48, color = C.white, w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...line, stroke: color, strokeWidth: w }}>
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);
export const CheckIcon = ({ size = 48, color = C.forest, w = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...line, stroke: color, strokeWidth: w }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const XIcon = ({ size = 48, color = C.red, w = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ ...line, stroke: color, strokeWidth: w }}>
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

// ---------- Residuos (ilustraciones simples) ----------
export const Battery = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="40" y="6" width="20" height="10" rx="3" fill="#B8BDB4" />
    <rect x="28" y="14" width="44" height="80" rx="9" fill="#1D1F1B" />
    <rect x="28" y="14" width="44" height="30" rx="9" fill="#E5A50A" />
    <rect x="28" y="34" width="44" height="10" fill="#E5A50A" />
    <path d="M44 62h12M50 56v12" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
export const Bottle = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="42" y="4" width="16" height="10" rx="2" fill={C.blue} />
    <path d="M42 14h16v8c10 6 14 12 14 22v42a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8V44c0-10 4-16 14-22Z" fill="#BFE3F2" stroke="#7DB9D3" strokeWidth="2" />
    <rect x="28" y="50" width="44" height="18" fill="#9FE870" />
  </svg>
);
export const Banana = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M18 30c6 34 34 52 66 44-4 8-16 16-34 14C26 85 10 62 12 32Z" fill="#F2C94C" stroke="#C99A1E" strokeWidth="2" />
    <path d="M12 32l-4-10 8 2Z" fill="#6B4E16" />
    <path d="M84 74l8-2-4 6Z" fill="#6B4E16" />
  </svg>
);
export const Phone = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="28" y="6" width="44" height="88" rx="8" fill="#2A2C27" />
    <rect x="32" y="14" width="36" height="66" rx="3" fill="#5E7A8A" />
    <path d="M32 40l36-20M32 64l36-28" stroke="#88A3B2" strokeWidth="3" />
    <circle cx="50" cy="87" r="3" fill="#6A6C6A" />
  </svg>
);
export const Mask = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M10 42c6-6 8-6 14-4M90 42c-6-6-8-6-14-4M10 62c6 4 8 4 14 2M90 62c-6 4-8 4-14 2" stroke="#9FB7C9" strokeWidth="3" fill="none" />
    <rect x="22" y="30" width="56" height="42" rx="10" fill="#CFE6F5" stroke="#9FB7C9" strokeWidth="2" />
    <path d="M24 44h52M24 52h52M24 60h52" stroke="#9FB7C9" strokeWidth="2" />
  </svg>
);
export const Cup = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M24 18h52l-7 74H31Z" fill="#FFFFFF" stroke="#B8BDB4" strokeWidth="2" />
    <path d="M27 40h46l-2 18H29Z" fill="#8B5A2B" />
    <rect x="20" y="12" width="60" height="8" rx="3" fill="#D9DDD5" />
  </svg>
);

// ---------- Caneca ----------
// Caneca con tapa que se puede abrir (lid de 0 a 1) y etiqueta opcional
export const Bin = ({ color, lidColor, size = 240, lid = 0, label, labelColor = '#fff', symbol, glow = 0, tint }) => {
  const w = size, h = size * 1.15;
  return (
    <div style={{ position: 'relative', width: w, height: h + 60, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={w} height={h} viewBox="0 0 100 115" style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${glow * 30}px ${tint || C.lime})` : 'none' }}>
        <g style={{ transformOrigin: '8px 22px', transform: `rotate(${-lid * 55}deg)` }}>
          <rect x="6" y="14" width="88" height="10" rx="4" fill={lidColor} />
          <rect x="40" y="7" width="20" height="8" rx="3" fill={lidColor} />
        </g>
        <path d="M10 26h80l-8 84a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5Z" fill={tint || color} />
        <path d="M10 26h80l-1 10H11Z" fill="rgba(0,0,0,0.12)" />
        {symbol && <g transform="translate(34 52) scale(1.3)">{symbol}</g>}
      </svg>
      {label && <div style={{ marginTop: 14, fontWeight: 700, fontSize: size * 0.13, color: labelColor, textAlign: 'center' }}>{label}</div>}
    </div>
  );
};

// Símbolos pequeños para el frente de cada caneca
const sym = (paths, color) => (
  <g style={{ ...line, stroke: color, strokeWidth: 2 }}>{paths}</g>
);
export const binSymbols = {
  organic: sym(<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>, '#fff'),
  recyclable: sym(<><path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" /><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" /><path d="m14 16-3 3 3 3" /><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" /></>, C.blue),
  non: sym(<><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" /></>, '#fff'),
};

// Las tres canecas colombianas con sus colores
export const GreenBin = (p) => <Bin color={C.green} lidColor="#26742F" symbol={binSymbols.organic} {...p} />;
export const WhiteBin = (p) => <Bin color="#F4F5F2" lidColor="#D9DDD5" symbol={binSymbols.recyclable} {...p} />;
export const BlackBin = (p) => <Bin color="#1D1F1B" lidColor="#33352F" symbol={binSymbols.non} {...p} />;

// Logo de EcoSort (círculo verde con hoja lima)
export const Logo = ({ size = 120 }) => (
  <div style={{ width: size, height: size, borderRadius: size, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 ${size * 0.06}px ${C.lime}` }}>
    <LeafIcon size={size * 0.55} color={C.lime} w={2.2} />
  </div>
);

// Pastilla de texto (etiqueta redondeada)
export const Pill = ({ children, bg = C.linen, color = C.forest, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderRadius: 999, background: bg, color, fontWeight: 700, fontSize: 30, ...style }}>{children}</div>
);
