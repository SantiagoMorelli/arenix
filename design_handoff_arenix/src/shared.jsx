// Shared UI primitives + theming
const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

// ─── Theme ───────────────────────────────────────────────
const PALETTES = {
  dark: {
    bg: '#0F1923', surface: '#1A2734', alt: '#243447',
    text: '#E8ECF1', dim: '#7A8EA0', line: '#2A3A4A',
    ok: '#2ECC71', err: '#E74C3C',
    shell: '#080E14', scoreBg: '#0A141E',
    orange: '#F5A623', teal: '#00BCD4', pink: '#EC4899',
  },
  light: {
    bg: '#F5F6F8', surface: '#FFFFFF', alt: '#EDF0F4',
    text: '#1A1D23', dim: '#6B7280', line: '#E2E5EB',
    ok: '#16A34A', err: '#DC2626',
    shell: '#E8EBF0', scoreBg: '#1A2734',
    orange: '#E8850C', teal: '#0891B2', pink: '#DB2777',
  },
};

const ACCENTS = {
  orange: { dark: '#F5A623', light: '#E8850C' },
  teal:   { dark: '#00BCD4', light: '#0891B2' },
  pink:   { dark: '#EC4899', light: '#DB2777' },
  lime:   { dark: '#84CC16', light: '#65A30D' },
};

const ThemeContext = createContext(null);

function useTheme() { return useContext(ThemeContext); }

function buildTheme(mode, accentKey) {
  const p = PALETTES[mode];
  const accent = ACCENTS[accentKey]?.[mode] || p.orange;
  return {
    mode, accentKey, ...p, accent,
    accentSoft: hexA(accent, 0.15),
    accentLine: hexA(accent, 0.4),
    tealSoft:   hexA(p.teal, 0.15),
    okSoft:     hexA(p.ok, 0.15),
    errSoft:    hexA(p.err, 0.12),
    dimSoft:    hexA(p.dim, 0.12),
    free:       p.teal,
    freeSoft:   hexA(p.teal, 0.15),
  };
}

function hexA(hex, a) {
  const h = hex.replace('#','');
  const b = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
  const r = parseInt(b.slice(0,2),16), g = parseInt(b.slice(2,4),16), bl = parseInt(b.slice(4,6),16);
  return `rgba(${r},${g},${bl},${a})`;
}

// ─── Router (in-memory, with back stack) ───────────────────
const RouterContext = createContext(null);
function useRouter() { return useContext(RouterContext); }

// ─── Primitives ────────────────────────────────────────────
function Card({ children, style, onClick, gradient, border }) {
  const t = useTheme();
  return (
    <div
      onClick={onClick}
      className={onClick ? 'tap' : ''}
      style={{
        background: gradient
          ? `linear-gradient(135deg, ${t.surface}, ${t.alt})`
          : t.surface,
        borderRadius: 14,
        padding: '14px 16px',
        border: `1px solid ${border || t.line}`,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >{children}</div>
  );
}

function Badge({ children, color, solid, style }) {
  const t = useTheme();
  const c = color || t.accent;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: solid ? '#fff' : c,
      background: solid ? c : hexA(c, 0.15),
      padding: '4px 8px', borderRadius: 6,
      ...style,
    }}>{children}</span>
  );
}

function Label({ children, color, style }) {
  const t = useTheme();
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: color || t.dim,
      marginBottom: 10,
      ...style,
    }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = 'primary', color, icon, style, small }) {
  const t = useTheme();
  const c = color || t.accent;
  const bg = variant === 'primary' ? c
           : variant === 'soft'    ? hexA(c, 0.15)
           : variant === 'ghost'   ? 'transparent'
           : variant === 'surface' ? t.surface
           : c;
  const text = variant === 'primary' ? '#fff' : c;
  const border = variant === 'ghost' || variant === 'surface'
    ? `1px solid ${t.line}` : 'none';
  return (
    <button onClick={onClick} className="tap" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: bg, color: text, border,
      borderRadius: 12,
      padding: small ? '10px 14px' : '14px 16px',
      fontSize: small ? 12 : 14, fontWeight: 700,
      width: '100%',
      minHeight: small ? 40 : 48,
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

function IconBtn({ children, onClick, badge, style, size = 38 }) {
  const t = useTheme();
  return (
    <button onClick={onClick} className="tap" style={{
      position: 'relative',
      width: size, height: size, borderRadius: 12,
      background: t.alt, color: t.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {children}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 3px',
          borderRadius: 8, background: t.err, color: '#fff',
          fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${t.bg}`,
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  );
}

function Avatar({ player, size = 32, ring }) {
  const t = useTheme();
  if (!player) return null;
  const bg = `oklch(0.55 0.15 ${player.hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32,
      background: bg, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700,
      boxShadow: ring ? `0 0 0 2px ${t.bg}, 0 0 0 3.5px ${ring}` : undefined,
      flexShrink: 0,
    }}>{player.initials}</div>
  );
}

function PlayerChip({ player, color, small }) {
  const t = useTheme();
  const c = color || t.accent;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: small ? 10 : 11, fontWeight: 600,
      color: c, background: hexA(c, 0.15),
      padding: small ? '3px 7px' : '4px 9px',
      borderRadius: 6,
    }}>
      <span style={{
        width: small ? 5 : 6, height: small ? 5 : 6,
        borderRadius: '50%', background: `oklch(0.6 0.15 ${player.hue})`,
      }}/>
      {player.short}
    </span>
  );
}

// ─── Phone Frame ────────────────────────────────────────────
function PhoneFrame({ children }) {
  const t = useTheme();
  return (
    <div className="notch-phone">
      <div className="screen" style={{ background: t.bg }}>
        <div className="notch" />
        <div style={{ height: 48, flexShrink: 0 }} />
        <div className="phone-scroll" style={{
          flex: 1, overflow: 'auto', position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}>
          {children}
        </div>
        <div className="home-indicator" style={{
          background: t.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)',
        }} />
      </div>
    </div>
  );
}

// ─── Header with back ───
function PageHeader({ title, sub, onBack, rightSlot, badge, badgeColor, big }) {
  const t = useTheme();
  return (
    <div style={{
      padding: '6px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {onBack && (
        <button onClick={onBack} className="tap" style={{
          width: 36, height: 36, borderRadius: 10, background: t.alt,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icons.back s={18} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: big ? 22 : 17, fontWeight: 700, color: t.text,
          letterSpacing: -0.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: t.dim, marginTop: 1 }}>{sub}</div>}
      </div>
      {badge && (
        <Badge color={badgeColor} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {badge === 'LIVE' && (
            <span className="dot-pulse" style={{
              width: 6, height: 6, borderRadius: '50%', background: badgeColor || t.ok,
              display: 'inline-block', color: badgeColor || t.ok,
            }}/>
          )}
          {badge}
        </Badge>
      )}
      {rightSlot}
    </div>
  );
}

// ─── Bottom Nav ───
function BottomNav({ items, active, onChange, color }) {
  const t = useTheme();
  const c = color || t.accent;
  return (
    <div style={{
      display: 'flex',
      borderTop: `1px solid ${t.line}`,
      background: t.surface,
      padding: '6px 0 10px',
      flexShrink: 0,
    }}>
      {items.map(it => {
        const on = active === it.id;
        const I = Icons[it.icon];
        return (
          <button key={it.id} onClick={() => onChange(it.id)} className="tap" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '6px 0',
            color: on ? c : t.dim,
          }}>
            <I s={20} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Bottom sheet ───
function Sheet({ open, onClose, children }) {
  const t = useTheme();
  if (!open) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    }}>
      <div onClick={onClose} className="overlay-enter" style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
      }}/>
      <div className="sheet-enter" style={{
        position: 'relative', zIndex: 2,
        background: t.bg, borderRadius: '22px 22px 0 0',
        padding: '14px 16px 24px',
        maxHeight: '82%', overflowY: 'auto',
      }}>
        <div style={{
          width: 38, height: 4, background: t.alt, borderRadius: 2,
          margin: '0 auto 14px',
        }}/>
        {children}
      </div>
    </div>
  );
}

// ─── Toast ───
function Toast({ message }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <div className="pop-enter" style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: t.text, color: t.bg,
      padding: '10px 18px', borderRadius: 12,
      fontSize: 13, fontWeight: 600,
      zIndex: 200,
      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
      whiteSpace: 'nowrap',
    }}>{message}</div>
  );
}

// Court icon/illustration placeholder for imagery
function CourtIllus({ accent, h = 80 }) {
  const t = useTheme();
  return (
    <svg width="100%" height={h} viewBox="0 0 200 80" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <pattern id="sand" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill={hexA(accent, 0.08)}/>
          <circle cx="1" cy="1" r="0.5" fill={hexA(accent, 0.2)}/>
          <circle cx="3" cy="3" r="0.4" fill={hexA(accent, 0.15)}/>
        </pattern>
      </defs>
      <rect width="200" height="80" fill="url(#sand)"/>
      <rect x="20" y="10" width="160" height="60" fill="none" stroke={hexA(accent, 0.5)} strokeWidth="1"/>
      <line x1="100" y1="10" x2="100" y2="70" stroke={accent} strokeWidth="1.5" strokeDasharray="3 2"/>
    </svg>
  );
}

Object.assign(window, {
  useTheme, ThemeContext, buildTheme, hexA, PALETTES, ACCENTS,
  RouterContext, useRouter,
  Card, Badge, Label, Btn, IconBtn, Avatar, PlayerChip,
  PhoneFrame, PageHeader, BottomNav, Sheet, Toast, CourtIllus,
});
