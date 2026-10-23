// Build-time data access for Astro pages. Validates every JSON file with zod,
// so a malformed edit fails the build instead of reaching the live site.
import { z } from 'astro/zod';
import topicsJson from '../data/topics.json';
import statementsJson from '../data/statements.json';
import partiesJson from '../data/parties.json';
import listsJson from '../data/lists.json';
import positionsJson from '../data/positions.json';
import metaJson from '../data/meta.json';
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
  axis: z.object({
    dip: z.union([z.literal(1), z.literal(-1)]).optional(),
    rel: z.union([z.literal(1), z.literal(-1)]).optional(),
    gov: z.union([z.literal(1), z.literal(-1)]).optional(),
  }),
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

const positionIndex = new Map(positions.map((p) => [`${p.party}|${p.statement}`, p]));
export const positionOf = (partyId: string, statementId: string) =>
  positionIndex.get(`${partyId}|${statementId}`);
export const topicOf = (id: string) => topics.find((t) => t.id === id);
export const partyOf = (id: string) => parties.find((p) => p.id === id);
export const statementsOfTopic = (topicId: string) => statements.filter((s) => s.topic === topicId);

/** The compact payload the quiz and compare islands fetch at runtime. */
export function quizPayload(): QuizData {
  return {
    updated: meta.lastUpdated,
    topics: topics.map(({ id, title, question, summary }) => ({ id, title, question, summary })),
    statements: statements.map(({ id, order, quick, topic, text, axis }) => ({ id, order, quick, topic, text, axis })),
    parties: parties.map(({ id, name, short_name, letters, leader }) => ({ id, name, short_name, letters, leader })),
    positions: positions.map((p) => ({
      ...p,
      stance: p.stance as Stance | null,
      sources: p.sources.map((s) => ({
        title: s.title,
        outlet: s.outlet ?? undefined,
        date: s.date ?? undefined,
        url: s.url,
      })),
    })),
  };
}
