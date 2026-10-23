import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  ANSWER_LABELS,
  decodeAnswers,
  encodeAnswers,
  statementsFor,
  type Answers,
  type Mode,
  type QuizData,
  type Stance,
} from '../../lib/scoring';
import Results from './Results';

interface Props {
  dataUrl: string;
  baseUrl: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'intro' }
  | { kind: 'question'; index: number }
  | { kind: 'results' };

const STORAGE_KEY = 'hapetek-sheli:v1';
const ANSWER_ORDER: Stance[] = [2, 1, 0, -1, -2];

interface Saved {
  mode: Mode;
  answers: Answers;
  index: number;
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(state: Saved | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be unavailable (private mode); the quiz still works */
  }
}

function setHash(code: string | null) {
  const url = new URL(window.location.href);
  url.hash = code ? `r=${code}` : '';
  history.replaceState(null, '', code ? url.toString() : url.toString().replace(/#$/, ''));
}

export default function Quiz({ dataUrl, baseUrl }: Props) {
  const [data, setData] = useState<QuizData | null>(null);
  const [mode, setMode] = useState<Mode>('quick');
  const [answers, setAnswers] = useState<Answers>({});
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [resume, setResume] = useState<Saved | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<QuizData>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        start(d);
      })
      .catch(() => !cancelled && setPhase({ kind: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  function start(d: QuizData) {
    const hash = new URLSearchParams(window.location.hash.slice(1)).get('r');
    if (hash) {
      const decoded = decodeAnswers(d, hash);
      if (decoded) {
        setMode(decoded.mode);
        setAnswers(decoded.answers);
        setPhase({ kind: 'results' });
        return;
      }
    }
    const saved = loadSaved();
    const requested = new URLSearchParams(window.location.search).get('mode');
    if (requested === 'quick' || requested === 'full') {
      if (saved && saved.mode === requested && Object.keys(saved.answers).length > 0) {
        setResume(saved);
        setMode(requested);
        setPhase({ kind: 'intro' });
        return;
      }
      begin(requested, {}, d);
      return;
    }
    if (saved && Object.keys(saved.answers).length > 0) setResume(saved);
    setPhase({ kind: 'intro' });
  }

  function begin(m: Mode, initial: Answers, d = data, index = 0) {
    if (!d) return;
    setMode(m);
    setAnswers(initial);
    setResume(null);
    setHash(null);
    setPhase({ kind: 'question', index });
    save({ mode: m, answers: initial, index });
  }

  const list = useMemo(() => (data ? statementsFor(data, mode) : []), [data, mode]);

  function record(index: number, next: Answers) {
    setAnswers(next);
    if (index + 1 < list.length) {
      setPhase({ kind: 'question', index: index + 1 });
      save({ mode, answers: next, index: index + 1 });
    } else {
      finish(next);
    }
  }

  function finish(final: Answers) {
    if (!data) return;
    save({ mode, answers: final, index: list.length - 1 });
    setHash(encodeAnswers(data, final, mode));
    setPhase({ kind: 'results' });
    window.scrollTo({ top: 0 });
  }

  function continueFull() {
    if (!data) return;
    const full = statementsFor(data, 'full');
    const firstOpen = full.findIndex((s) => !answers[s.id]);
    setMode('full');
    setHash(null);
    const index = firstOpen < 0 ? 0 : firstOpen;
    setPhase({ kind: 'question', index });
    save({ mode: 'full', answers, index });
    window.scrollTo({ top: 0 });
  }

  function restart() {
    save(null);
    setHash(null);
    setAnswers({});
    setResume(null);
    setPhase({ kind: 'intro' });
    window.scrollTo({ top: 0 });
  }

  if (phase.kind === 'loading') {
    return (
      <div class="q-shell" aria-busy="true">
        <p class="q-muted">טוען את השאלון…</p>
      </div>
    );
  }
  if (phase.kind === 'error' || !data) {
    return (
      <div class="q-shell">
        <p>לא הצלחנו לטעון את השאלון. בדקו את החיבור ונסו לרענן את הדף.</p>
      </div>
    );
  }

  if (phase.kind === 'intro') {
    const quickCount = statementsFor(data, 'quick').length;
    const fullCount = statementsFor(data, 'full').length;
    return (
      <div class="q-shell q-intro">
        <h1 class="q-title">השאלון</h1>
        <p class="q-lead">
          לכל טענה בחרו עד כמה אתם בעד או נגד. אפשר לדלג על טענה, ולסמן טענות שחשובות לכם במיוחד: הן ייספרו
          פעמיים. בסוף תראו את אחוז ההתאמה לכל רשימה ואת הפירוט, טענה אחר טענה.
        </p>
        <ul class="q-facts">
          <li>התשובות נשמרות רק במכשיר שלכם. שום דבר לא נשלח לשרת.</li>
          <li>התוצאה לא אומרת למי להצביע. היא מראה קרבה בנושאים שבשאלון בלבד.</li>
        </ul>
        {resume && (
          <div class="q-resume panel">
            <p>
              יש לכם שאלון שהתחלתם ({Object.keys(resume.answers).length} תשובות). להמשיך מאיפה שעצרתם?
            </p>
            <div class="q-actions">
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => {
                  const statementsInMode = statementsFor(data, resume.mode);
                  const firstOpen = statementsInMode.findIndex((s) => !resume.answers[s.id]);
                  if (firstOpen < 0) {
                    setMode(resume.mode);
                    setAnswers(resume.answers);
                    setResume(null);
                    setHash(encodeAnswers(data, resume.answers, resume.mode));
                    setPhase({ kind: 'results' });
                  } else {
                    begin(resume.mode, resume.answers, data, firstOpen);
                  }
                }}
              >
                להמשיך
              </button>
              <button type="button" class="btn btn-quiet" onClick={restart}>
                להתחיל מחדש
              </button>
            </div>
          </div>
        )}
        <div class="q-modes">
          <button type="button" class="q-mode" onClick={() => begin('quick', {})}>
            <span class="q-mode-title">שאלון קצר</span>
            <span class="q-mode-meta">{quickCount} טענות, כ-3 דקות</span>
          </button>
          <button type="button" class="q-mode" onClick={() => begin('full', {})}>
            <span class="q-mode-title">שאלון מלא</span>
            <span class="q-mode-meta">{fullCount} טענות, כ-7 דקות</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === 'results') {
    return (
      <Results
        data={data}
        answers={answers}
        mode={mode}
        baseUrl={baseUrl}
        onRestart={restart}
        onContinueFull={continueFull}
        onEdit={() => {
          setHash(null);
          setPhase({ kind: 'question', index: 0 });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const statement = list[phase.index];
  return (
    <Question
      key={statement.id}
      data={data}
      index={phase.index}
      total={list.length}
      statementId={statement.id}
      answers={answers}
      baseUrl={baseUrl}
      onAnswer={(next) => record(phase.index, next)}
      onBack={() => {
        if (phase.index === 0) setPhase({ kind: 'intro' });
        else setPhase({ kind: 'question', index: phase.index - 1 });
      }}
    />
  );
}

interface QuestionProps {
  data: QuizData;
  index: number;
  total: number;
  statementId: string;
  answers: Answers;
  baseUrl: string;
  onAnswer: (next: Answers) => void;
  onBack: () => void;
}

function Question({ data, index, total, statementId, answers, baseUrl, onAnswer, onBack }: QuestionProps) {
  const statement = data.statements.find((s) => s.id === statementId)!;
  const topic = data.topics.find((t) => t.id === statement.topic);
  const current = answers[statementId];
  const [important, setImportant] = useState(current?.important ?? false);
  const [picked, setPicked] = useState<Stance | 'skip' | null>(current?.value ?? null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    return () => window.clearTimeout(timer.current);
  }, []);

  function choose(value: Stance | 'skip') {
    if (timer.current !== undefined) return;
    setPicked(value);
    const next: Answers = {
      ...answers,
      [statementId]: { value, important: value === 'skip' ? false : important },
    };
    timer.current = window.setTimeout(() => onAnswer(next), value === 'skip' ? 0 : 260);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) choose(ANSWER_ORDER[n - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const progress = Math.round((index / total) * 100);

  return (
    <div class="q-shell q-question">
      <div class="q-top">
        <button type="button" class="q-back" onClick={onBack}>
          <span aria-hidden="true">→</span> חזרה
        </button>
        <span class="q-count num">
          {index + 1} מתוך {total}
        </span>
      </div>
      <div
        class="q-progress"
        role="progressbar"
        aria-label="התקדמות בשאלון"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      {topic && <p class="q-topic">{topic.title}</p>}
      <h2 class="q-statement" tabIndex={-1} ref={headingRef}>
        {statement.text}
      </h2>

      {topic?.summary && (
        <details class="q-context">
          <summary>רקע קצר</summary>
          <p>{topic.summary}</p>
          <a href={`${baseUrl}issues/${topic.id}/`} target="_blank" rel="noopener">
            הרקע המלא והטיעונים של שני הצדדים
          </a>
        </details>
      )}

      <button
        type="button"
        class={`q-important${important ? ' on' : ''}`}
        aria-pressed={important}
        onClick={() => setImportant(!important)}
      >
        <span aria-hidden="true" class="q-star">
          {important ? '★' : '☆'}
        </span>
        חשוב לי במיוחד
        <span class="q-important-note">{important ? 'ייספר פעמיים' : ''}</span>
      </button>

      <div class="q-answers" role="group" aria-label="התשובה שלכם">
        {ANSWER_ORDER.map((v) => (
          <button
            type="button"
            key={v}
            class={`q-answer${picked === v ? ' picked' : ''}`}
            aria-pressed={picked === v}
            onClick={() => choose(v)}
          >
            {ANSWER_LABELS[v]}
          </button>
        ))}
      </div>
      <button type="button" class="q-skip" onClick={() => choose('skip')}>
        דלגו על הטענה
      </button>
    </div>
  );
}
