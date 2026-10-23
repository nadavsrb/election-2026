import { useMemo, useState } from 'preact/hooks';
import {
  AXES,
  indexPositions,
  partyAxisValue,
  userAxisValue,
  type Answers,
  type AxisKey,
  type QuizData,
} from '../../lib/scoring';

interface Props {
  data: QuizData;
  answers: Answers;
}

const PAIRS: [AxisKey, AxisKey][] = [
  ['dip', 'rel'],
  ['dip', 'gov'],
  ['rel', 'gov'],
];

// Plot geometry (SVG user units). The SVG scales to the container width.
const W = 360;
const H = 360;
const PAD = { top: 34, right: 16, bottom: 34, left: 16 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const FONT = 11;

interface Point {
  id: string;
  label: string;
  title: string;
  x: number;
  y: number;
  user?: boolean;
}

export default function AxesMap({ data, answers }: Props) {
  const [pair, setPair] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const index = useMemo(() => indexPositions(data.positions), [data]);
  const [ax, ay] = PAIRS[pair];

  const user = {
    x: userAxisValue(data.statements, answers, ax),
    y: userAxisValue(data.statements, answers, ay),
  };

  const parties = data.parties.map((p) => ({
    party: p,
    x: partyAxisValue(data, index, p.id, ax),
    y: partyAxisValue(data, index, p.id, ay),
  }));

  const placed: Point[] = parties
    .filter((p) => p.x !== null && p.y !== null)
    .map((p) => ({
      id: p.party.id,
      label: p.party.short_name,
      title: p.party.name,
      x: sx(p.x!),
      y: sy(p.y!),
    }));
  separateDots(placed);
  const userPoint: Point | null =
    user.x !== null && user.y !== null ? { id: 'you', label: 'אתם', title: 'אתם', x: sx(user.x), y: sy(user.y), user: true } : null;
  const labels = placeLabels(userPoint ? [userPoint, ...placed] : placed);
  const missing = parties.filter((p) => p.x === null || p.y === null);

  return (
    <section class="wrap-narrow r-section" aria-labelledby="map-title">
      <h2 id="map-title" class="r-h2">איפה אתם על המפה</h2>
      <p class="r-note">
        המיקום מחושב מהטענות שקשורות לכל ציר: אצלכם לפי התשובות, אצל הרשימות לפי העמדות שלהן. זה סיכום גס
        שעוזר לראות כיוון כללי, לא מדידה מדויקת.
      </p>

      <div class="map-tabs" role="tablist" aria-label="בחירת צירים">
        {PAIRS.map(([a, b], i) => (
          <button
            type="button"
            role="tab"
            aria-selected={pair === i}
            class={`map-tab${pair === i ? ' on' : ''}`}
            onClick={() => {
              setPair(i);
              setActive(null);
            }}
          >
            {AXES[a].title} / {AXES[b].title}
          </button>
        ))}
      </div>

      {userPoint === null && (
        <p class="r-note map-warn">
          עניתם על פחות משתי טענות באחד הצירים האלה, ולכן אין לנו איך למקם אתכם עליו. אפשר לבחור צירים אחרים
          או לענות על השאלון המלא.
        </p>
      )}

      <figure class="map-figure">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="map-desc" class="map-svg">
          <desc id="map-desc">
            {`מפה של ${placed.length} רשימות${userPoint ? ' והמיקום שלכם' : ''} לפי ${AXES[ax].title} ו${AXES[ay].title}. הנתונים המלאים מופיעים בטבלה שמתחת.`}
          </desc>
          <rect x={PAD.left} y={PAD.top} width={PW} height={PH} class="map-plot" />
          <line x1={PAD.left} x2={PAD.left + PW} y1={sy(0)} y2={sy(0)} class="map-grid" />
          <line x1={sx(0)} x2={sx(0)} y1={PAD.top} y2={PAD.top + PH} class="map-grid" />

          {/* Axis end labels. x grows to the right (the conventional political "right"). */}
          <text x={PAD.left + PW} y={H - 12} class="map-axis" text-anchor="end">
            {AXES[ax].high}
          </text>
          <text x={PAD.left} y={H - 12} class="map-axis" text-anchor="start">
            {AXES[ax].low}
          </text>
          <text x={W / 2} y={18} class="map-axis" text-anchor="middle">
            {AXES[ay].high}
          </text>

          {placed.map((p) => (
            <g
              key={p.id}
              class={`map-dot${active === p.id ? ' on' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={p.title}
              onClick={() => setActive(active === p.id ? null : p.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActive(active === p.id ? null : p.id)}
            >
              <circle cx={p.x} cy={p.y} r={14} class="map-hit" />
              <circle cx={p.x} cy={p.y} r={5} class="map-party" />
            </g>
          ))}
          {userPoint && (
            <g class="map-you">
              <circle cx={userPoint.x} cy={userPoint.y} r={9} class="map-you-ring" />
              <circle cx={userPoint.x} cy={userPoint.y} r={4.5} class="map-you-core" />
            </g>
          )}
          {labels.map((l) => (
            <text
              key={`l-${l.id}`}
              x={l.lx}
              y={l.ly}
              class={`map-label${l.user ? ' you' : ''}${active === l.id ? ' on' : ''}`}
              text-anchor="middle"
            >
              {l.label}
            </text>
          ))}
        </svg>
        <figcaption class="map-legend">
          <span>
            <span class="map-key you" aria-hidden="true" /> אתם
          </span>
          <span>
            <span class="map-key" aria-hidden="true" /> רשימות
          </span>
          <span class="map-bottom-label">למטה: {AXES[ay].low}</span>
        </figcaption>
      </figure>

      <p class={`map-active${active ? ' on' : ''}`} role="status">
        {active
          ? data.parties.find((p) => p.id === active)?.name
          : labels.length < placed.length + (userPoint ? 1 : 0)
            ? 'כשנקודות קרובות מדי, חלק מהשמות מוסתרים. לחצו על נקודה כדי לראות את שם הרשימה.'
            : ''}
      </p>

      <details class="map-table">
        <summary>להציג כטבלה</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">רשימה</th>
              <th scope="col">{AXES[ax].title}</th>
              <th scope="col">{AXES[ay].title}</th>
            </tr>
          </thead>
          <tbody>
            {userPoint && (
              <tr class="you">
                <th scope="row">אתם</th>
                <td class="num"><span dir="ltr">{fmt(user.x)}</span></td>
                <td class="num"><span dir="ltr">{fmt(user.y)}</span></td>
              </tr>
            )}
            {parties.map((p) => (
              <tr key={p.party.id}>
                <th scope="row">{p.party.name}</th>
                <td class="num"><span dir="ltr">{fmt(p.x)}</span></td>
                <td class="num"><span dir="ltr">{fmt(p.y)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p class="r-note">
          הערכים בין 100- ל-100. בציר {AXES[ax].title}: ערך חיובי פירושו {AXES[ax].high}. בציר {AXES[ay].title}: ערך
          חיובי פירושו {AXES[ay].high}.
        </p>
      </details>
      {missing.length > 0 && (
        <p class="r-note">
          לא מוצגות במפה, כי אין מספיק עמדות ידועות בצירים האלה: {missing.map((m) => m.party.short_name).join(', ')}.
        </p>
      )}
    </section>
  );
}

function sx(v: number) {
  return PAD.left + ((v + 1) / 2) * PW;
}
function sy(v: number) {
  return PAD.top + ((1 - v) / 2) * PH;
}
function fmt(v: number | null) {
  return v === null ? 'אין מספיק נתונים' : String(Math.round(v * 100));
}

/** Nudge dots that land on the same spot so every dot stays visible. */
function separateDots(points: Point[]) {
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < i; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (Math.hypot(dx, dy) < 9) {
        const angle = (i * 137.5 * Math.PI) / 180;
        points[i].x = clamp(points[i].x + Math.cos(angle) * 10, PAD.left + 6, PAD.left + PW - 6);
        points[i].y = clamp(points[i].y + Math.sin(angle) * 10, PAD.top + 6, PAD.top + PH - 6);
      }
    }
  }
}

interface Label extends Point {
  lx: number;
  ly: number;
}

/**
 * Greedy label placement around each dot. A label that cannot be placed without
 * overlapping is left out; that dot stays reachable by tap and in the table view.
 */
function placeLabels(points: Point[]): Label[] {
  const boxes: { x1: number; x2: number; y1: number; y2: number }[] = points.map((p) => ({
    x1: p.x - 6,
    x2: p.x + 6,
    y1: p.y - 6,
    y2: p.y + 6,
  }));
  const out: Label[] = [];
  const width = (s: string) => s.length * FONT * 0.56 + 4;
  for (const p of points) {
    const w = width(p.label);
    const candidates: [number, number][] = [
      [p.x, p.y - 10],
      [p.x, p.y + 19],
      [p.x + w / 2 + 9, p.y + 4],
      [p.x - w / 2 - 9, p.y + 4],
      [p.x + w / 2 + 5, p.y - 9],
      [p.x - w / 2 - 5, p.y - 9],
      [p.x + w / 2 + 5, p.y + 17],
      [p.x - w / 2 - 5, p.y + 17],
    ];
    for (const [cx, cy] of candidates) {
      const box = { x1: cx - w / 2, x2: cx + w / 2, y1: cy - FONT, y2: cy + 2 };
      const inside = box.x1 >= 2 && box.x2 <= W - 2 && box.y1 >= PAD.top - 4 && box.y2 <= H - 30;
      const hit = boxes.some((b) => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1);
      if (inside && !hit) {
        boxes.push(box);
        out.push({ ...p, lx: cx, ly: cy });
        break;
      }
    }
  }
  return out;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
