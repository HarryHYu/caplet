/**
 * Parser interface — turns a document's raw text into structured chunk records.
 *
 * This is the swap-in point for parsing quality. A parser receives the plain
 * text of one document plus context (kind + run metadata) and returns an array
 * of records ready to embed + store. Each record MUST have `chunk_text` (the
 * string that gets embedded) and MAY carry extra metadata columns:
 *
 *   curriculum: { chunk_text, outcome_code?, outcome_text?, content_point? }
 *   marking:    { chunk_text, question_ref?, max_marks?, chunk_type? }
 *
 * The ingestion script merges these over the run-level metadata (stage,
 * subject, etc.), so a record only needs to supply what it actually knows.
 *
 * Implementations:
 *   - GenericParser        : structure-aware chunking, no extra metadata (safe default)
 *   - LlmCurriculumParser  : LLM extraction of outcomes + content points
 *   - LlmMarkingParser     : LLM extraction of criteria + exemplars
 */

class BaseParser {
  /**
   * @param {string} text  plain text of one document
   * @param {{kind:string, meta:object}} context
   * @returns {Promise<Array<{chunk_text:string}>>}
   */
  async parse(/* text, context */) {
    throw new Error('parse() not implemented');
  }
}

module.exports = { BaseParser };
