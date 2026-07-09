/**
 * Connector factory — pick a source by name.
 *
 *   getConnector('local',  { folder })              -> LocalFolderConnector
 *   getConnector('gdrive', { folderId })            -> GoogleDriveConnector
 *   getConnector('s3',     { bucket, prefix })      -> S3Connector (AWS S3 / R2 / etc.)
 *
 * Add future sources here and nothing downstream changes.
 */

const { LocalFolderConnector } = require('./localFolderConnector');
const { GoogleDriveConnector } = require('./googleDriveConnector');
const { S3Connector } = require('./s3Connector');

function getConnector(name, opts = {}) {
  switch ((name || '').toLowerCase()) {
    case 'local':
      return new LocalFolderConnector(opts);
    case 'gdrive':
    case 'google':
    case 'googledrive':
      return new GoogleDriveConnector(opts);
    case 's3':
    case 'r2':
    case 'bucket':
      return new S3Connector(opts);
    default:
      throw new Error(`Unknown connector "${name}". Use 'local', 'gdrive', or 's3'.`);
  }
}

module.exports = { getConnector };
