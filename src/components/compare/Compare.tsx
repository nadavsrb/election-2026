import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  CONFIDENCE_LABELS,
  STANCE_LABELS,
  indexPositions,
  type QuizData,
  type QuizPosition,
  type Stance,
} from '../../lib/scoring';

interface Props {
  dataUrl: string;
  baseUrl: string;
}

const MAX = 3;
const CELLS: Stance[] = [2, 1, 0, -1, -2];

export default function Compare({ dataUrl, baseUrl }: Props) {
  const [data, setData] = useState<QuizData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(dataUrl)
      .then((r) => (r.ok ? (r.json() as Promise<QuizData>) : Promise.reject()))
      .then((d) => {
        setData(d);
        const wanted = (new URLSearchParams(window.location.search).get('p') ?? '')
          .split(',')
          .filter((id) => d.parties.some((p) => p.id === id))
          .slice(0, MAX);
        setSelected(wanted);
      })
      .catch(() => setFailed(true));
  }, [dataUrl]);

  useEffect(() => {
    if (!data) return;
    const url = new URL(window.location.href);
    if (selected.length) url.searchParams.set('p', selected.join(','));
    else url.searchParams.delete('p');
    history.replaceState(null, '', url.toString());
  }, [selected, data]);

  const index = useMemo(() => (data ? indexPositions(data.positions) : new Map()), [data]);
  const parties = useMemo(
    () => (data ? [...data.parties].sort((a, b) => a.short_name.localeCompare(b.short_name, 'he')) : []),
    [data],
  );

  if (failed) return <p class="c-msg">לא הצלחנו לטעון את הנתונים. נסו לרענן את הדף.</p>;
  if (!data) return <p class="c-msg">טוען…</p>;

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]));
  }

  const chosen = selected.map((id) => data.parties.find((p) => p.id === id)!).filter(Boolean);
  const statements = [...data.statements].sort((a, b) => a.order - b.order);

  return (
    <div class="c-wrap">
      <fieldset class="c-picker">
        <legend>בחרו עד {MAX} רשימות ({selected.length} נבחרו)</legend>
        <div class="c-chips">
          {parties.map((p) => {
            const on = selected.includes(p.id);
            const disabled = !on && selected.length >= MAX;
            return (
              <button
                type="button"
                key={p.id}
                class={`c-chip${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggle(p.id)}
              >
                <span class="c-chip-letters">{p.letters}</span>
                {p.short_name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {chosen.length === 0 ? (
        <p class="c-msg">בחרו רשימות כדי לראות את העמדות שלהן זו לצד זו.</p>
      ) : (
        <div class="c-table" style={`--cols:${chosen.length}`}>
          <div class="c-head" aria-hidden="true">
            {chosen.map((p) => (
              <a class="c-head-cell" href={`${baseUrl}parties/${p.id}/`}>
                <span class="slip c-head-slip">
                  <span class="slip-letters">{p.letters}</span>
                </span>
                <span class="c-head-name">{p.short_name}</span>
              </a>
            ))}
          </div>
          {data.topics.map((t) => {
            const items = statements.filter((s) => s.topic === t.id);
            if (!items.length) return null;
            return (
              <section class="c-topic" key={t.id}>
                <h2 class="c-topic-title">
                  <a href={`${baseUrl}issues/${t.id}/`}>{t.title}</a>
                </h2>
                {items.map((s) => (
                  <div class="c-row" key={s.id}>
                    <p class="c-text">{s.text}</p>
                    <div class="c-cells">
                      {chosen.map((p) => (
                        <Cell key={p.id} name={p.short_name} pos={index.get(`${p.id}|${s.id}`)} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ name, pos }: { name: string; pos: QuizPosition | undefined }) {
  const [open, setOpen] = useState(false);
  const known = pos && pos.stance !== null;
  return (
    <div class="c-cell">
      <span class="c-cell-party">{name}</span>
      <span class="c-scale" aria-hidden="true">
        {CELLS.map((c) => (
          <span class={`c-dot${known && pos!.stance === c ? ' on' : ''}`} />
        ))}
      </span>
      <span class="c-label">{known ? STANCE_LABELS[pos!.stance as Stance] : 'אין עמדה ידועה'}</span>
      {known && (
        <>
          <span class="c-conf">{CONFIDENCE_LABELS[pos!.confidence]}</span>
          <button type="button" class="c-more" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? 'להסתיר' : 'על מה זה מבוסס'}
          </button>
          {open && (
            <div class="c-basis">
              <p>{pos!.basis}</p>
              <ul>
                {pos!.sources.map((src) => (
                  <li key={src.url}>
                    <a class="source-link" href={src.url} target="_blank" rel="noopener noreferrer">
                      {[src.outlet, src.title, src.date].filter(Boolean).join(', ')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
