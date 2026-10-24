// Pure quiz logic shared by the quiz and compare islands. No DOM, no Astro imports.

export type Stance = -2 | -1 | 0 | 1 | 2;
export type Confidence = 'high' | 'medium' | 'low';
export type AxisKey = 'dip' | 'rel' | 'gov';

export interface Source {
  title: string;
  outlet?: string;
  date?: string;
  url: string;
}

export interface QuizStatement {
  id: string;
  order: number;
  quick: boolean;
  topic: string;
  text: string;
  context?: string;
  axis: Partial<Record<AxisKey, 1 | -1>>;
}

export interface QuizTopic {
  id: string;
  title: string;
  question: string;
  summary?: string;
}

/** Whom a list says it will recommend for prime minister. A declaration, not a prediction. */
export type PmKind = 'self' | 'candidate' | 'conditional' | 'none' | 'unknown';

export interface PmRecommendation {
  kind: PmKind;
  summary: string;
  basis: string;
  sources: Source[];
}

export interface QuizParty {
  id: string;
  name: string;
  short_name: string;
  letters: string;
  leader: string;
  pm: PmRecommendation;
}

export interface QuizPosition {
  party: string;
  statement: string;
  stance: Stance | null;
  confidence: Confidence;
  basis: string;
  sources: Source[];
}

export interface QuizData {
  updated: string;
  topics: QuizTopic[];
  statements: QuizStatement[];
  parties: QuizParty[];
  positions: QuizPosition[];
}

export interface Answer {
  value: Stance | 'skip';
  important: boolean;
}

export type Answers = Record<string, Answer>;
export type Mode = 'quick' | 'full';

export const ANSWER_LABELS: Record<Stance, string> = {
  2: 'בעד מאוד',
  1: 'בעד',
  0: 'באמצע',
  [-1]: 'נגד',
  [-2]: 'נגד מאוד',
} as Record<Stance, string>;

export const STANCE_LABELS: Record<Stance, string> = {
  2: 'בעד מאוד',
  1: 'בעד',
  0: 'עמדה מעורבת',
  [-1]: 'נגד',
  [-2]: 'נגד מאוד',
} as Record<Stance, string>;

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: 'עמדה מפורשת',
  medium: 'לפי הצהרות ופעולות',
  low: 'הערכה',
};

export const AXES: Record<AxisKey, { title: string; low: string; high: string }> = {
  dip: { title: 'מדיני-ביטחוני', low: 'גישה יונית', high: 'גישה ניצית' },
  rel: { title: 'דת ומדינה', low: 'פחות מקום לדת במרחב הציבורי', high: 'יותר מקום לדת במרחב הציבורי' },
  gov: {
    title: 'משפט וממשל',
    low: 'חיזוק מערכת המשפט והייעוץ המשפטי',
    high: 'חיזוק הממשלה והכנסת מול מערכת המשפט',
  },
};

export function statementsFor(data: QuizData, mode: Mode): QuizStatement[] {
  const sorted = [...data.statements].sort((a, b) => a.order - b.order);
  return mode === 'quick' ? sorted.filter((s) => s.quick) : sorted;
}

export function indexPositions(positions: QuizPosition[]): Map<string, QuizPosition> {
  return new Map(positions.map((p) => [`${p.party}|${p.statement}`, p]));
}

export interface StatementRow {
  statement: QuizStatement;
  answer: Answer;
  position: QuizPosition | undefined;
  /** 0..1, null when the party has no known stance */
  agreement: number | null;
}

export interface PartyResult {
  party: QuizParty;
  /** 0..1, null when there is no overlap at all */
  score: number | null;
  /** share of the visitor's answered statements where the party has a known stance */
  coverage: number;
  used: number;
  answered: number;
  rows: StatementRow[];
}

/**
 * City-block agreement on a 5-point scale: identical answers score 1,
 * opposite extremes score 0. Statements marked important count twice.
 * Statements the visitor skipped, or where the party has no known stance, are left out
 * (and the coverage figure says how much was left out).
 */
export function scoreParties(data: QuizData, answers: Answers, shuffleSeed = Math.random()): PartyResult[] {
  const index = indexPositions(data.positions);
  const ordered = [...data.statements].sort((a, b) => a.order - b.order);
  const results = data.parties.map((party): PartyResult => {
    let num = 0;
    let den = 0;
    let used = 0;
    let answered = 0;
    const rows: StatementRow[] = [];
    for (const statement of ordered) {
      const answer = answers[statement.id];
      if (!answer || answer.value === 'skip') continue;
      answered++;
      const position = index.get(`${party.id}|${statement.id}`);
      if (!position || position.stance === null) {
        rows.push({ statement, answer, position, agreement: null });
        continue;
      }
      const agreement = 1 - Math.abs(answer.value - position.stance) / 4;
      const weight = answer.important ? 2 : 1;
      num += weight * agreement;
      den += weight;
      used++;
      rows.push({ statement, answer, position, agreement });
    }
    return {
      party,
      score: den > 0 ? num / den : null,
      coverage: answered > 0 ? used / answered : 0,
      used,
      answered,
      rows,
    };
  });

  // Shuffle first so that ties never favour a fixed order, then sort by rounded score.
  const shuffled = seededShuffle(results, shuffleSeed);
  return shuffled.sort((a, b) => Math.round((b.score ?? -1) * 100) - Math.round((a.score ?? -1) * 100));
}

/** Position on an axis in [-1, 1], or null when fewer than two statements inform it. */
export function axisValue(
  statements: QuizStatement[],
  valueOf: (statementId: string) => number | null,
  axis: AxisKey,
): number | null {
  let sum = 0;
  let n = 0;
  for (const s of statements) {
    const dir = s.axis[axis];
    if (!dir) continue;
    const v = valueOf(s.id);
    if (v === null) continue;
    sum += v * dir;
    n++;
  }
  return n >= 2 ? sum / (2 * n) : null;
}

export function userAxisValue(statements: QuizStatement[], answers: Answers, axis: AxisKey): number | null {
  return axisValue(
    statements,
    (id) => {
      const a = answers[id];
      return a && a.value !== 'skip' ? a.value : null;
    },
    axis,
  );
}

export function partyAxisValue(
  data: QuizData,
  index: Map<string, QuizPosition>,
  partyId: string,
  axis: AxisKey,
): number | null {
  return axisValue(
    data.statements,
    (id) => index.get(`${partyId}|${id}`)?.stance ?? null,
    axis,
  );
}

// ── Share encoding ────────────────────────────────────────────────────────────
// v1.<mode>.<one char per statement in `order` order>
// '0' unanswered, 's' skipped, 'a'..'e' = -2..2, uppercase = marked important.

const LETTERS = 'abcde';

export function encodeAnswers(data: QuizData, answers: Answers, mode: Mode): string {
  const ordered = [...data.statements].sort((a, b) => a.order - b.order);
  const chars = ordered.map((s) => {
    const a = answers[s.id];
    if (!a) return '0';
    if (a.value === 'skip') return 's';
    const c = LETTERS[a.value + 2];
    return a.important ? c.toUpperCase() : c;
  });
  return `v1.${mode === 'quick' ? 'q' : 'f'}.${chars.join('')}`;
}

export function decodeAnswers(data: QuizData, code: string): { mode: Mode; answers: Answers } | null {
  const m = /^v1\.([qf])\.([0sa-eA-E]+)$/.exec(code.trim());
  if (!m) return null;
  const ordered = [...data.statements].sort((a, b) => a.order - b.order);
  const chars = m[2];
  const answers: Answers = {};
  ordered.forEach((s, i) => {
    const c = chars[i];
    if (!c || c === '0') return;
    if (c === 's') {
      answers[s.id] = { value: 'skip', important: false };
      return;
    }
    const idx = LETTERS.indexOf(c.toLowerCase());
    if (idx < 0) return;
    answers[s.id] = { value: (idx - 2) as Stance, important: c !== c.toLowerCase() };
  });
  return { mode: m[1] === 'q' ? 'quick' : 'full', answers };
}

// Deterministic Fisher–Yates so a page render and its re-render agree.
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = Math.floor(seed * 2 ** 31) || 1;
  const rand = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/** "2026-10-22" → "22.10.2026", "2026-10" → "אוקטובר 2026", "2026" → "2026". */
export function formatSourceDate(date?: string | null): string {
  if (!date) return '';
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(date);
  if (!m) return '';
  const [, y, mo, d] = m;
  if (d) return `${Number(d)}.${Number(mo)}.${y}`;
  if (mo) return `${HEB_MONTHS[Number(mo) - 1] ?? ''} ${y}`.trim();
  return y;
}

/** "outlet, title, date" with empty parts left out. */
export function sourceLabel(src: { outlet?: string | null; title: string; date?: string | null }): string {
  return [src.outlet, src.title, formatSourceDate(src.date)].filter(Boolean).join(', ');
}
