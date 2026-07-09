/**
 * LlmCurriculumParser — extract structured syllabus records with an LLM.
 *
 * Reads messy syllabus text and returns one record per CONTENT POINT, tagged
 * with its outcome code and outcome statement where present. The embedded
 * chunk_text is composed to be self-describing (stage + code + outcome + point),
 * which is what makes retrieval accurate.
 *
 * Robust by design: if a segment can't be parsed, it falls back to generic
 * structure-aware chunking for that segment so no content is ever lost.
 *
 * Cost: one cheap LLM call per ~6k-char segment, once at ingestion time.
 * Model: LIBRARY_PARSER_MODEL env var, default 'gpt-5.4-mini'.
 */

const { BaseParser } = require('./baseParser');
const { getClient } = require('../../embeddings');
const { chunkStructured } = require('../chunker');
const { segment } = require('./segment');

const MODEL = process.env.LIBRARY_PARSER_MODEL || 'gpt-5.4-mini';

const SYSTEM = `You extract structured records from NSW curriculum syllabus text.
Return ONLY JSON of the form:
{"records":[{"outcome_code":"","outcome_text":"","content_point":""}]}

Rules:
- One record per content point (a single syllabus dot point / thing students learn or do).
- outcome_code: the official code like "MA5-EQU-C" if it appears in the text; otherwise null.
- outcome_text: the outcome statement the content point sits under; otherwise null.
- content_point: the specific content point text (one item).
- Do NOT invent codes, outcomes, or content. Copy wording from the text.
- If the text contains no curriculum content, return {"records":[]}.`;

class LlmCurriculumParser extends BaseParser {
  async parse(text, context = {}) {
    const client = getClient();
    if (!client) throw new Error('LLM parser needs OPENAI_API_KEY.');

    const stage = context.meta && context.meta.stage;
    const records = [];

    for (const seg of segment(text)) {
      try {
        const res = await client.chat.completions.create({
          model: MODEL,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: seg },
          ],
        });
        const parsed = JSON.parse(res.choices?.[0]?.message?.content || '{}');
        const recs = Array.isArray(parsed.records) ? parsed.records : [];

        for (const r of recs) {
          const cp = (r.content_point || '').trim();
          if (!cp) continue;
          const tag = [stage, r.outcome_code].filter(Boolean).join(' | ');
          const chunk_text = [
            tag ? `[${tag}]` : '',
            (r.outcome_text || '').trim(),
            cp,
          ].filter(Boolean).join('\n');
          records.push({
            outcome_code: r.outcome_code || null,
            outcome_text: r.outcome_text || null,
            content_point: cp,
            chunk_text,
          });
        }
      } catch (e) {
        // Don't lose content if extraction fails — fall back to generic chunks.
        for (const chunk_text of chunkStructured(seg)) records.push({ chunk_text });
      }
    }
    return records;
  }
}

module.exports = { LlmCurriculumParser };
