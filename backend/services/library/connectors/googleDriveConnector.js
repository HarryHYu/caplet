/**
 * GoogleDriveConnector — reads resource files from a shared Google Drive folder.
 *
 * Your team drops past papers, syllabus exports, marking guidelines, etc. into
 * ONE shared Drive folder; this connector lists and downloads them for ingestion.
 *
 * AUTH (service account — recommended for server-side access to a shared folder):
 *   1. In Google Cloud Console, create a project and enable the "Google Drive API".
 *   2. Create a Service Account; create a JSON key for it; download the key file.
 *   3. Share your Drive folder with the service account's email
 *      (looks like: my-bot@my-project.iam.gserviceaccount.com) as Viewer.
 *   4. Set env vars (see docs/library-setup.md):
 *        GOOGLE_DRIVE_FOLDER_ID        = the folder id from its URL
 *        GOOGLE_SERVICE_ACCOUNT_JSON   = the key file contents, base64-encoded
 *                                        (base64 so it fits in one env var on Railway)
 *
 * Requires the `googleapis` package:  cd backend && npm install googleapis
 *
 * Native Google Docs/Sheets/Slides are EXPORTED to text/plain; everything else
 * (PDF, images, docx) is downloaded as raw bytes for the text-extraction step.
 */

const { BaseConnector } = require('./baseConnector');

// Google "native" types must be exported, not downloaded directly.
const GOOGLE_EXPORT = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
};

function loadCredentials() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!b64) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set (base64 of the service-account key JSON).');
  }
  try {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid base64-encoded JSON.');
  }
}

class GoogleDriveConnector extends BaseConnector {
  /** @param {{folderId?: string}} opts */
  constructor({ folderId } = {}) {
    super();
    this.folderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!this.folderId) {
      throw new Error('GoogleDriveConnector requires a folderId (or GOOGLE_DRIVE_FOLDER_ID env var).');
    }
    this._drive = null;
  }

  async _client() {
    if (this._drive) return this._drive;
    // Lazy require so the app still boots if googleapis isn't installed and
    // Drive isn't being used.
    let google;
    try {
      ({ google } = require('googleapis'));
    } catch (e) {
      throw new Error('The `googleapis` package is not installed. Run: cd backend && npm install googleapis');
    }
    const auth = new google.auth.GoogleAuth({
      credentials: loadCredentials(),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    this._drive = google.drive({ version: 'v3', auth: await auth.getClient() });
    return this._drive;
  }

  async listResources() {
    const drive = await this._client();
    const files = [];
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${this.folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, modifiedTime)',
        pageSize: 200,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const f of res.data.files || []) {
        // Skip nested folders for the skeleton (flat folder model).
        if (f.mimeType === 'application/vnd.google-apps.folder') continue;
        files.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          // md5 is absent for native Google Docs; fall back to modifiedTime.
          checksum: f.md5Checksum || f.modifiedTime,
        });
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    return files;
  }

  async fetchResource(ref) {
    const drive = await this._client();
    const exportMime = GOOGLE_EXPORT[ref.mimeType];

    if (exportMime) {
      const res = await drive.files.export(
        { fileId: ref.id, mimeType: exportMime },
        { responseType: 'text' }
      );
      return { ...ref, text: typeof res.data === 'string' ? res.data : String(res.data) };
    }

    const res = await drive.files.get(
      { fileId: ref.id, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    return { ...ref, buffer: Buffer.from(res.data) };
  }
}

module.exports = { GoogleDriveConnector };
