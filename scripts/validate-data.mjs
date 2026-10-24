// Cross-checks the JSON data files so a broken reference or a missing source fails CI
// before anything reaches the live site. Run: npm run validate
import { readFileSync, existsSync } from 'node:fs';

const dir = new URL('../src/data/', import.meta.url);
const load = (name, fallback) => {
  const file = new URL(name, dir);
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
};

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const topics = load('topics.json', []);
const statements = load('statements.json', []);
const parties = load('parties.json', []);
const lists = load('lists.json', []);
const positions = load('positions.json', []);
const pollsFile = load('polls.json', { polls: [] });

const unique = (arr, key, label) => {
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x[key])) err(`${label}: duplicate ${key} "${x[key]}"`);
    seen.add(x[key]);
  }
  return seen;
};

const topicIds = unique(topics, 'id', 'topics');
const statementIds = unique(statements, 'id', 'statements');
const partyIds = unique(parties, 'id', 'parties');
unique(statements, 'order', 'statements');

for (const s of statements) {
  if (!topicIds.has(s.topic)) err(`statement ${s.id}: unknown topic "${s.topic}"`);
  if (!s.text?.trim()) err(`statement ${s.id}: empty text`);
  for (const [axis, dir] of Object.entries(s.axis ?? {})) {
    if (!['dip', 'rel', 'gov'].includes(axis)) err(`statement ${s.id}: unknown axis ${axis}`);
    if (![1, -1].includes(dir)) err(`statement ${s.id}: axis ${axis} must be 1 or -1`);
  }
}
for (const t of topics) {
  if (!statements.some((s) => s.topic === t.id)) warn(`topic ${t.id} has no statements`);
}

const isUrl = (u) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u);
const checkSources = (where, sources, required) => {
  if (!Array.isArray(sources) || sources.length === 0) {
    if (required) err(`${where}: no sources`);
    return;
  }
  for (const src of sources) {
    if (!isUrl(src.url)) err(`${where}: bad source url ${JSON.stringify(src.url)}`);
    else if (/\/\/([^/]*\.)?example\.(com|org|net|invalid)\b/.test(src.url)) err(`${where}: placeholder source ${src.url}`);
    if (!src.title?.trim()) warn(`${where}: source without title (${src.url})`);
  }
};

const PM_KINDS = new Set(['self', 'candidate', 'conditional', 'none', 'unknown']);
for (const p of parties) {
  for (const f of ['name', 'short_name', 'letters', 'leader', 'description']) {
    if (!p[f]?.toString().trim()) err(`party ${p.id}: missing ${f}`);
  }
  // the declared PM recommendation follows the same rule as positions: a claim needs a source
  const pm = p.pm;
  if (!pm || !PM_KINDS.has(pm.kind)) {
    err(`party ${p.id}: missing or invalid pm`);
    continue;
  }
  if (!pm.summary?.trim()) err(`party ${p.id}: pm without summary`);
  if (['self', 'candidate'].includes(pm.kind) && !pm.candidate?.trim()) err(`party ${p.id}: pm ${pm.kind} without candidate`);
  if (pm.kind === 'unknown') {
    if (pm.sources?.length) err(`party ${p.id}: unknown pm should have no sources`);
  } else {
    if (!pm.basis?.trim()) err(`party ${p.id}: pm without basis`);
    checkSources(`party ${p.id} pm`, pm.sources, true);
  }
}
if (lists.length && parties.length) {
  for (const p of parties) {
    if (!lists.some((l) => l.letters === p.letters)) warn(`party ${p.id}: letters "${p.letters}" not found in lists.json`);
  }
}

// Polls: only ones published before the ban, with every list reported and seats adding up to 120.
const BAN_DATE = '2026-10-23';
for (const poll of pollsFile.polls ?? []) {
  const where = `poll ${poll.id}`;
  for (const f of ['id', 'outlet', 'pollster', 'date', 'title']) {
    if (!poll[f]?.toString().trim()) err(`${where}: missing ${f}`);
  }
  checkSources(where, [{ title: poll.title, url: poll.url }], true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(poll.date ?? '') || poll.date > BAN_DATE) err(`${where}: date ${poll.date} is not before the ban`);
  const seats = poll.seats ?? {};
  for (const id of Object.keys(seats)) if (!partyIds.has(id)) err(`${where}: unknown party ${id}`);
  for (const id of partyIds) {
    if (!(id in seats)) err(`${where}: no value for ${id}`);
    else if (seats[id] !== null && (!Number.isInteger(seats[id]) || seats[id] < 0 || (seats[id] > 0 && seats[id] < 4)))
      err(`${where}: impossible seats for ${id}: ${seats[id]}`);
  }
  const total = [...Object.values(seats), ...Object.values(poll.other ?? {})].reduce((a, n) => a + (n ?? 0), 0);
  if (Object.values(seats).some((n) => n === null)) warn(`${where}: some lists not reported`);
  else if (total !== 120) err(`${where}: seats add up to ${total}, not 120`);
}

const seenPairs = new Set();
const STANCES = new Set([-2, -1, 0, 1, 2, null]);
for (const pos of positions) {
  const where = `position ${pos.party}/${pos.statement}`;
  if (!partyIds.has(pos.party)) err(`${where}: unknown party`);
  if (!statementIds.has(pos.statement)) err(`${where}: unknown statement`);
  const key = `${pos.party}|${pos.statement}`;
  if (seenPairs.has(key)) err(`${where}: duplicate`);
  seenPairs.add(key);
  if (!STANCES.has(pos.stance)) err(`${where}: invalid stance ${pos.stance}`);
  if (pos.stance !== null) {
    if (!['high', 'medium', 'low'].includes(pos.confidence)) err(`${where}: invalid confidence`);
    if (!pos.basis?.trim()) err(`${where}: missing basis`);
    checkSources(where, pos.sources, true);
  }
}
if (positions.length) {
  for (const p of parties) {
    for (const s of statements) {
      if (!seenPairs.has(`${p.id}|${s.id}`)) err(`missing position ${p.id}/${s.id}`);
    }
  }
}

const known = positions.filter((p) => p.stance !== null).length;
console.log(
  `topics ${topics.length}, statements ${statements.length}, parties ${parties.length}, lists ${lists.length}, positions ${positions.length} (${known} with a stance)`,
);
for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log('data OK');
