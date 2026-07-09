/**
 * Connector interface — the "source-agnostic" abstraction.
 *
 * A connector knows how to (a) list the resource files in some source and
 * (b) fetch the raw bytes/text of one. Everything downstream (text extraction,
 * chunking, embedding, storage) is identical no matter where the file came
 * from, so adding a new source = writing one new connector that implements
 * this contract. Today we ship LocalFolderConnector and GoogleDriveConnector.
 *
 * A "resource" is described by:
 *   {
 *     id:        string   // stable unique id within this connector
 *     name:      string   // filename / title
 *     mimeType:  string   // best-effort MIME type
 *     checksum:  string   // changes when the file content changes (for dedup)
 *   }
 *
 * fetchResource(ref) returns:
 *   {
 *     ...ref,
 *     buffer?:  Buffer    // raw bytes (PDFs, images, docx)
 *     text?:    string    // already-plain text (txt, md, exported Google Docs)
 *   }
 * Exactly one of buffer/text will be present.
 */

class BaseConnector {
  /** @returns {Promise<Array<{id,name,mimeType,checksum}>>} */
  async listResources() {
    throw new Error('listResources() not implemented');
  }

  /** @param {{id,name,mimeType,checksum}} ref */
  async fetchResource(/* ref */) {
    throw new Error('fetchResource() not implemented');
  }
}

module.exports = { BaseConnector };
