import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { buildEconomicsQuestionBank } = require('../services/questionBankService');

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '../..');
const sourcePath = resolve(repositoryRoot, 'src/data/economicsResourceLibrary.js');
const outputPath = resolve(scriptDirectory, '../data/economicsQuestionBank.json');

const libraryModule = await import(pathToFileURL(sourcePath).href);
const questionBank = buildEconomicsQuestionBank(libraryModule);
await writeFile(outputPath, `${JSON.stringify(questionBank, null, 2)}\n`, 'utf8');

console.log(`Generated ${questionBank.length} Economics questions at ${outputPath}`);
