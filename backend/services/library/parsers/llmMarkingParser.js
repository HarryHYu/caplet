/**
 * LlmMarkingParser — extract structured marking records with an LLM.
 *
 * Reads marking guidelines / criteria / band descriptors / exemplar answers /
 * past papers and returns one record per criterion or exemplar, tagged with
 * the question and marks where present.
 *
 * Robust: falls back to generic chunking for any segment it can't parse.
 * Model: LIBRARY_PARSER_MODEL env var, default 'gpt-5.4-mini'.
 */

const { BaseParser } = require('./baseParser');
const { getClient } = require('../../embeddings');
const { chunkStructured } = require('../chunker');
const { segment } = require('./segment');

const MODEL = process.env.LIBRARY_PARSER_MODEL || 'gpt-5.4-mini';

const SYSTEM = `You extract structured marking records from NSW exam marking material.
Return ONLY JSON of the form:
{"records":[{"question_ref":"","max_marks":null,"chunk_type":"criterion","text":""}]}

Rules:
- chunk_type is one of:
    "criterion"  = a marking criterion / band descriptor / mark allocation rule
    "exemplar"   = a sample answer or worked solution
    "guideline"  = general marking guidance not tied to one criterion
- question_ref: e.g. "Q21(a)" if identifiable; otherwise null.
- max_marks: integer if the material states a mark value; otherwise null.
- text: the criterion / exemplar / guideline content, copied from the source.
- Do NOT invent marks or criteria. If there is no marking content, return {"records":[]}.`;

class LlmMarkingParser extends BaseParser {
  async parse(text, context = {}) {
    const client = getClient();
    if (!client) throw new Error('LLM parser needs OPENAI_API_KEY.');

    const subject = context.meta && context.meta.subject;
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
          const body = (r.text || '').trim();
          if (!body) continue;
          const type = ['criterion', 'exemplar', 'guideline'].includes(r.chunk_type)
            ? r.chunk_type : 'guideline';
          const tag = [subject, r.question_ref, type].filter(Boolean).join(' | ');
          const chunk_text = [tag ? `[${tag}]` : '', body].filter(Boolean).join('\n');
          records.push({
            question_ref: r.question_ref || null,
            max_marks: Number.isInteger(r.max_marks) ? r.max_marks : null,
            chunk_type: type,
            chunk_text,
          });
        }
      } catch (e) {
        for (const chunk_text of chunkStructured(seg)) {
          records.push({ chunk_type: 'guideline', chunk_text });
        }
      }
    }
    return records;
  }
}

module.exports = { LlmMarkingParser };
