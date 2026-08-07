const DB_NAME = 'caplet-assessment-files';
const STORE_NAME = 'attachments';

const openDatabase = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) return reject(new Error('File storage is not available in this browser.'));
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const run = async (mode, action) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
};

export const saveAssessmentAttachment = (id, file) => run('readwrite', (store) => store.put(file, id));
export const getAssessmentAttachment = (id) => run('readonly', (store) => store.get(id));
export const deleteAssessmentAttachment = (id) => run('readwrite', (store) => store.delete(id));
