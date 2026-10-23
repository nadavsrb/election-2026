import type { APIRoute } from 'astro';
import { quizPayload } from '../../lib/data';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(quizPayload()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
