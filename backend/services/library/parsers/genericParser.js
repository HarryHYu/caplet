/**
 * GenericParser — the safe default.
 *
 * Structure-aware chunking with no LLM and no extra per-chunk metadata. Every
 * chunk inherits the run-level metadata (stage, subject, etc.). Use this when
 * the source is simple, when you want zero extra cost, or as the fallback for
 * documents the LLM parser can't handle.
 */

const { BaseParser } = require('./baseParser');
const { chunkStructured } = require('../chunker');

class GenericParser extends BaseParser {
  async parse(text /* , context */) {
    return chunkStructured(text).map((chunk_text) => ({ chunk_text }));
  }
}

module.exports = { GenericParser };
