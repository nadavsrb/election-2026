// Build-time data access for Astro pages. Validates every JSON file with zod,
// so a malformed edit fails the build instead of reaching the live site.
import { z } from 'astro/zod';
import topicsJson from '../data/topics.json';
import statementsJson from '../data/statements.json';
import partiesJson from '../data/parties.json';
import listsJson from '../data/lists.json';
import positionsJson from '../data/positions.json';
import metaJson from '../data/meta.json';
import pollsJson from '../data/polls.json';
import type { QuizData, Stance } from './scoring';

const source = z.object({
  title: z.string(),
  outlet: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  url: z.string().url(),
});

const topic = z.object({
  id: z.string(),
  title: z.string(),
  question: z.string(),
  summary: z.string().optional(),
  background: z.string().optional(),
  for: z.array(z.string()).optional(),
  against: z.array(z.string()).optional(),
  sources: z.array(source).optional(),
});

const statement = z.object({
  id: z.string(),
  order: z.number().int(),
  quick: z.boolean(),
  topic: z.string(),
  text: z.string(),
  context: z.string().optional(),
  axis: z.object({
    dip: z.union([z.literal(1), z.literal(-1)]).optional(),
    rel: z.union([z.literal(1), z.literal(-1)]).optional(),
    gov: z.union([z.literal(1), z.literal(-1)]).optional(),
  }),
});

// What the list said about whom it will recommend to the President to form the government.
const pm = z.object({
  kind: z.enum(['self', 'candidate', 'conditional', 'none', 'unknown']),
  candidate: z.string().nullable(),
  summary: z.string().min(1),
  basis: z.string(),
  sources: z.array(source),
});

const party = z.object({
  id: z.string(),
  name: z.string(),
  short_name: z.string(),
  letters: z.string(),
  leader: z.string(),
  top10: z.array(z.string()).default([]),
  components: z.array(z.string()).default([]),
  results_2022: z.string().nullable().optional(),
  bloc_status: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  platform_url: z.string().url().nullable().optional(),
  self_description: z
    .object({ quote: z.string(), source: source.nullable().optional() })
    .nullable()
    .optional(),
  founded: z.number().int().nullable().optional(),
  description: z.string(),
  inclusion_note: z.string().nullable().optional(),
  pm,
  sources: z.array(source).default([]),
});

const list = z.object({
  name: z.string(),
  letters: z.string().nullable(),
  leader: z.string().nullable(),
  note: z.string().nullable().optional(),
  status: z.enum(['running', 'withdrew', 'conditional', 'disqualified']),
  main_id: z.string().nullable().optional(),
});

const stance = z.union([z.literal(-2), z.literal(-1), z.literal(0), z.literal(1), z.literal(2)]);
const position = z.object({
  party: z.string(),
  statement: z.string(),
  stance: stance.nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  basis: z.string(),
  sources: z.array(source),
});

// The last poll each outlet published before the ban on new polls. Seats are copied from the source;
// 0 means below the threshold and null means the source didn't report the list.
const poll = z.object({
  id: z.string(),
  outlet: z.string(),
  pollster: z.string(),
  date: z.string(),
  title: z.string(),
  url: z.string().url(),
  seats: z.record(z.string(), z.number().int().min(0).max(120).nullable()),
  below_pct: z.record(z.string(), z.string()).default({}),
  other: z.record(z.string(), z.number().int().min(0)).default({}),
});

export type Poll = z.infer<typeof poll>;
export type Topic = z.infer<typeof topic>;
export type Statement = z.infer<typeof statement>;
export type Party = z.infer<typeof party>;
export type BallotList = z.infer<typeof list>;
export type Position = z.infer<typeof position>;

export const topics: Topic[] = z.array(topic).parse(topicsJson);
export const statements: Statement[] = z
  .array(statement)
  .parse(statementsJson)
  .sort((a, b) => a.order - b.order);
export const parties: Party[] = z.array(party).parse(partiesJson);
export const lists: BallotList[] = z.array(list).parse(listsJson);
export const positions: Position[] = z.array(position).parse(positionsJson);
export const meta = metaJson;
export const polls: Poll[] = z.object({ polls: z.array(poll) }).parse(pollsJson).polls;

/** One line on how a list did in the published polls, or null when no poll reported it. */
export function pollLine(partyId: string): string | null {
  const values = polls.map((p) => p.seats[partyId]).filter((v): v is number => typeof v === 'number');
  if (!values.length) return null;
  const n = values.length;
  const above = values.filter((v) => v > 0);
  const below = n - above.length;
  if (!above.length) return n === 1 ? 'מתחת לאחוז החסימה' : `מתחת לאחוז החסימה בכל ${n} הסקרים`;
  const lo = Math.min(...above);
  const hi = Math.max(...above);
  const range = lo === hi ? `${lo} מושבים` : `בין ${lo} ל-${hi} מושבים`;
  if (!below) return range;
  return below === 1
    ? `${range}, ובסקר אחד מתוך ${n} מתחת לאחוז החסימה`
    : `${range}, ומתחת לאחוז החסימה ב-${below} מתוך ${n} הסקרים`;
}

const positionIndex = new Map(positions.map((p) => [`${p.party}|${p.statement}`, p]));
export const positionOf = (partyId: string, statementId: string) =>
  positionIndex.get(`${partyId}|${statementId}`);
export const topicOf = (id: string) => topics.find((t) => t.id === id);
export const partyOf = (id: string) => parties.find((p) => p.id === id);
export const statementsOfTopic = (topicId: string) => statements.filter((s) => s.topic === topicId);

const compactSource = (s: z.infer<typeof source>) => ({
  title: s.title,
  outlet: s.outlet ?? undefined,
  date: s.date ?? undefined,
  url: s.url,
});

/** The compact payload the quiz and compare islands fetch at runtime. */
export function quizPayload(): QuizData {
  return {
    updated: meta.lastUpdated,
    topics: topics.map(({ id, title, question, summary }) => ({ id, title, question, summary })),
    statements: statements.map(({ id, order, quick, topic, text, context, axis }) => ({ id, order, quick, topic, text, context, axis })),
    parties: parties.map(({ id, name, short_name, letters, leader, pm }) => ({
      id,
      name,
      short_name,
      letters,
      leader,
      pm: { kind: pm.kind, summary: pm.summary, basis: pm.basis, sources: pm.sources.map(compactSource) },
      polls: pollLine(id),
    })),
    positions: positions.map((p) => ({
      ...p,
      stance: p.stance as Stance | null,
      sources: p.sources.map(compactSource),
    })),
    pollCount: polls.length,
  };
}
