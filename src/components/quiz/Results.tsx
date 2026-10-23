import { useMemo, useState } from 'preact/hooks';
import {
  ANSWER_LABELS,
  CONFIDENCE_LABELS,
  STANCE_LABELS,
  encodeAnswers,
  scoreParties,
  statementsFor,
  type Answers,
  type Mode,
  type PartyResult,
  type QuizData,
  type StatementRow,
} from '../../lib/scoring';
import AxesMap from './AxesMap';

interface Props {
  data: QuizData;
  answers: Answers;
  mode: Mode;
  baseUrl: string;
  onRestart: () => void;
  onContinueFull: () => void;
  onEdit: () => void;
}

const MIN_COVERAGE = 0.5;

export default function Results({ data, answers, mode, baseUrl, onRestart, onContinueFull, onEdit }: Props) {
  const [seed] = useState(() => Math.random());
  const results = useMemo(() => scoreParties(data, answers, seed), [data, answers, seed]);
  const ranked = results.filter((r) => r.score !== null && r.coverage >= MIN_COVERAGE);
  const thin = results.filter((r) => r.score === null || r.coverage < MIN_COVERAGE);

  const answered = Object.values(answers).filter((a) => a.value !== 'skip').length;
  const importantCount = Object.values(answers).filter((a) => a.value !== 'skip' && a.important).length;
  const remaining = mode === 'quick' ? statementsFor(data, 'full').filter((s) => !answers[s.id]).length : 0;
  const top = ranked.slice(0, 3);

  if (answered === 0) {
    return (
      <div class="q-shell">
        <h2 class="q-title">לא נבחרה אף תשובה</h2>
        <p class="q-lead">דילגתם על כל הטענות, ולכן אין על מה לחשב התאמה.</p>
        <button type="button" class="btn btn-primary" onClick={onRestart}>
          להתחיל מחדש
        </button>
      </div>
    );
  }

  return (
    <div class="r-shell">
      <header class="r-head wrap-narrow">
        <h2 class="q-title">הרשימות הקרובות לעמדות שלכם</h2>
        <p class="q-lead">
          לפי {answered} תשובות
          {importantCount > 0 ? `, מתוכן ${importantCount} שסימנתם כחשובות במיוחד` : ''}. זו לא המלצה: ההתאמה
          מחושבת רק על הטענות שבשאלון, ולא על נושאים אחרים, על אנשים או על יכולת ביצוע.
        </p>
      </header>

      {top.length > 0 && (
        <ol class="r-podium wrap-narrow" aria-label="שלוש הרשימות הקרובות ביותר">
          {top.map((r, i) => (
            <li style={`--i:${i}`}>
              <a class="slip r-podium-slip" href={`#party-${r.party.id}`}>
                <span class="slip-letters">{r.party.letters}</span>
                <span class="slip-name">{r.party.short_name}</span>
              </a>
              <span class="r-podium-score">{pct(r.score)}</span>
            </li>
          ))}
        </ol>
      )}

      <section class="wrap-narrow r-section" aria-labelledby="r-all">
        <h2 id="r-all" class="r-h2">כל הרשימות</h2>
        <p class="r-note">
          לחצו על רשימה כדי לראות, טענה אחר טענה, מה עניתם ומה עמדתה. כשהאחוזים שווים, הסדר אקראי.
        </p>
        <ol class="r-list">
          {ranked.map((r) => (
            <PartyRow key={r.party.id} result={r} baseUrl={baseUrl} />
          ))}
        </ol>
        {thin.length > 0 && (
          <div class="r-thin">
            <h3 class="r-h3">רשימות בלי מספיק מידע להשוואה</h3>
            <p class="r-note">
              לרשימות האלה לא מצאנו עמדה ידועה ברוב הטענות שעניתם עליהן, ולכן לא חישבנו להן אחוז.
            </p>
            <ol class="r-list">
              {thin.map((r) => (
                <PartyRow key={r.party.id} result={r} baseUrl={baseUrl} />
              ))}
            </ol>
          </div>
        )}
      </section>

      <AxesMap data={data} answers={answers} />

      <section class="wrap-narrow r-section r-next" aria-labelledby="r-next">
        <h2 id="r-next" class="r-h2">מה עכשיו?</h2>
        <div class="r-next-grid">
          {mode === 'quick' && remaining > 0 && (
            <button type="button" class="btn btn-primary" onClick={onContinueFull}>
              להמשיך לשאלון המלא (עוד {remaining} טענות)
            </button>
          )}
          {top.length > 1 && (
            <a class="btn btn-quiet" href={`${baseUrl}compare/?p=${top.map((r) => r.party.id).join(',')}`}>
              להשוות בין {top.length} הרשימות הראשונות
            </a>
          )}
          <button type="button" class="btn btn-quiet" onClick={onEdit}>
            לשנות תשובות
          </button>
          <button type="button" class="btn btn-quiet" onClick={onRestart}>
            להתחיל מחדש
          </button>
        </div>
        <Share data={data} answers={answers} mode={mode} baseUrl={baseUrl} />
      </section>

      <section class="wrap-narrow r-section r-method" aria-labelledby="r-method">
        <h2 id="r-method" class="r-h2">איך חושב אחוז ההתאמה</h2>
        <p>
          לכל טענה השווינו את התשובה שלכם לעמדת הרשימה בסולם של חמש דרגות. תשובה זהה שווה 100%, תשובה הפוכה
          לגמרי שווה 0%, וכל דרגת הפרש מורידה 25%. טענות שסימנתם כחשובות נספרות פעמיים. טענות שדילגתם עליהן,
          וטענות שבהן לא ידועה עמדת הרשימה, לא נכללות בחישוב.
        </p>
        <a href={`${baseUrl}about/#method`}>השיטה המלאה ומקורות העמדות</a>
      </section>
    </div>
  );
}

function pct(score: number | null) {
  return score === null ? 'אין נתונים' : `${Math.round(score * 100)}%`;
}

function PartyRow({ result, baseUrl }: { result: PartyResult; baseUrl: string }) {
  const [open, setOpen] = useState(false);
  const { party, score, used, answered } = result;
  const width = score === null ? 0 : Math.max(2, Math.round(score * 100));
  const panelId = `r-panel-${party.id}`;
  return (
    <li class="r-row" id={`party-${party.id}`}>
      <button
        type="button"
        class="r-row-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span class="slip r-mini-slip" aria-hidden="true">
          <span class="slip-letters">{party.letters}</span>
        </span>
        <span class="r-row-main">
          <span class="r-row-name">{party.short_name}</span>
          <span class="r-row-leader">{party.leader}</span>
          <span class="r-bar" aria-hidden="true">
            <span style={{ width: `${width}%` }} />
          </span>
        </span>
        <span class="r-row-score">{pct(score)}</span>
      </button>
      {open && (
        <div class="r-panel" id={panelId}>
          <p class="r-note">
            מבוסס על {used} מתוך {answered} התשובות שלכם.{' '}
            <a href={`${baseUrl}parties/${party.id}/`}>לפרופיל המלא של הרשימה</a>
          </p>
          <ul class="r-breakdown">
            {result.rows.map((row) => (
              <BreakdownItem key={row.statement.id} row={row} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function closeness(agreement: number | null) {
  if (agreement === null) return { label: 'אין עמדה ידועה', cls: 'none' };
  if (agreement >= 0.75) return { label: 'קרוב', cls: 'near' };
  if (agreement >= 0.5) return { label: 'חלקי', cls: 'mid' };
  return { label: 'רחוק', cls: 'far' };
}

function BreakdownItem({ row }: { row: StatementRow }) {
  const c = closeness(row.agreement);
  const { position, answer } = row;
  return (
    <li class="r-item">
      <p class="r-item-text">{row.statement.text}</p>
      <dl class="r-item-grid">
        <div>
          <dt>אתם</dt>
          <dd>
            {answer.value === 'skip' ? 'דילגתם' : ANSWER_LABELS[answer.value]}
            {answer.important && <span class="r-imp">★ חשוב לכם</span>}
          </dd>
        </div>
        <div>
          <dt>הרשימה</dt>
          <dd>
            {position && position.stance !== null ? STANCE_LABELS[position.stance] : 'אין עמדה ידועה'}
          </dd>
        </div>
        <div>
          <dt>התאמה</dt>
          <dd>
            <span class={`r-chip ${c.cls}`}>{c.label}</span>
          </dd>
        </div>
      </dl>
      {position && position.stance !== null && (
        <div class="r-basis">
          <p>
            <span class="r-conf">{CONFIDENCE_LABELS[position.confidence]}.</span> {position.basis}
          </p>
          <ul class="r-sources">
            {position.sources.map((s) => (
              <li key={s.url}>
                <a class="source-link" href={s.url} target="_blank" rel="noopener noreferrer">
                  {[s.outlet, s.title, s.date].filter(Boolean).join(', ')}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function Share({ data, answers, mode, baseUrl }: { data: QuizData; answers: Answers; mode: Mode; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = new URL(baseUrl, window.location.origin).toString();
  const text = `הפתק שלי: שאלון קצר שבודק אילו רשימות קרובות לעמדות שלכם לקראת הבחירות לכנסת. ${siteUrl}`;
  const resultsUrl = new URL(`${baseUrl}quiz/#r=${encodeAnswers(data, answers, mode)}`, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(resultsUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('העתיקו את הקישור:', resultsUrl);
    }
  }

  return (
    <div class="r-share">
      <h3 class="r-h3">שיתוף</h3>
      <div class="r-next-grid">
        <a class="btn btn-quiet" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">
          לשתף את האתר בוואטסאפ
        </a>
        <button type="button" class="btn btn-quiet" onClick={copy}>
          {copied ? 'הקישור הועתק' : 'להעתיק קישור לתוצאות שלי'}
        </button>
      </div>
      <p class="r-note">
        שיתוף האתר לא כולל את התשובות שלכם. הקישור לתוצאות כן כולל אותן, כך שמי שיקבל אותו יראה מה עניתם.
      </p>
    </div>
  );
}
