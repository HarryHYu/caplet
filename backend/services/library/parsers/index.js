/**
 * Parser factory — pick how documents are turned into chunks.
 *
 *   getParser('generic')              -> structure-aware chunking (no LLM)
 *   getParser('llm', 'curriculum')    -> LLM outcome/content-point extraction
 *   getParser('llm', 'marking')       -> LLM criterion/exemplar extraction
 *
 * Mirrors the connector pattern: add new parsing strategies here and the
 * ingestion script picks one with --parser= without changing anything else.
 */

const { GenericParser } = require('./genericParser');
const { LlmCurriculumParser } = require('./llmCurriculumParser');
const { LlmMarkingParser } = require('./llmMarkingParser');

function getParser(name, kind) {
  const n = (name || 'generic').toLowerCase();
  if (n === 'generic') return new GenericParser();
  if (n === 'llm') {
    if (kind === 'curriculum') return new LlmCurriculumParser();
    if (kind === 'marking') return new LlmMarkingParser();
    throw new Error(`No LLM parser for kind "${kind}".`);
  }
  throw new Error(`Unknown parser "${name}". Use 'generic' or 'llm'.`);
}

module.exports = { getParser };
