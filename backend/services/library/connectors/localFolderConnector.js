/**
 * LocalFolderConnector — reads resource files from a folder on disk.
 *
 * The simplest source: drop files in content/curriculum/ or content/marking/
 * and ingest them. Great for dev, tests, and prototyping before the Drive is
 * wired up. Uses file size + mtime as a cheap checksum.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { BaseConnector } = require('./baseConnector');

const MIME_BY_EXT = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const TEXT_EXTS = new Set(['.txt', '.md', '.json', '.html', '.htm']);

class LocalFolderConnector extends BaseConnector {
  /** @param {{folder: string}} opts absolute or cwd-relative folder path */
  constructor({ folder }) {
    super();
    if (!folder) throw new Error('LocalFolderConnector requires { folder }');
    this.folder = path.isAbsolute(folder) ? folder : path.resolve(process.cwd(), folder);
  }

  async listResources() {
    if (!fs.existsSync(this.folder)) {
      throw new Error(`Folder not found: ${this.folder}`);
    }
    const entries = fs.readdirSync(this.folder, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name.toLowerCase() !== 'readme.md')
      .map((e) => {
        const full = path.join(this.folder, e.name);
        const stat = fs.statSync(full);
        const ext = path.extname(e.name).toLowerCase();
        return {
          id: full, // absolute path is a stable id for a local file
          name: e.name,
          mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
          checksum: `${stat.size}:${Math.floor(stat.mtimeMs)}`,
        };
      });
  }

  async fetchResource(ref) {
    const ext = path.extname(ref.name).toLowerCase();
    if (TEXT_EXTS.has(ext)) {
      return { ...ref, text: fs.readFileSync(ref.id, 'utf8') };
    }
    return { ...ref, buffer: fs.readFileSync(ref.id) };
  }
}

// Exported for tests / reuse.
module.exports = { LocalFolderConnector, MIME_BY_EXT, TEXT_EXTS, sha256: (b) => crypto.createHash('sha256').update(b).digest('hex') };
