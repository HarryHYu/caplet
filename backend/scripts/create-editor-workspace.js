const { sequelize } = require('../config/database');
const EditorWorkspace = require('../models/EditorWorkspace');
const { digestEditorCode, generateEditorCode } = require('../utils/editorCode');

async function main() {
  await sequelize.authenticate();

  const code = process.argv[2] || generateEditorCode();
  const digest = digestEditorCode(code);

  const ws = await EditorWorkspace.create({ label: 'local-dev', codeDigest: digest });
  console.log('Workspace created:', ws.id);
  console.log('Your access code:', code);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
