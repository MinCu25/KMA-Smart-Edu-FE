/** Persist local drafts separately from JSON metadata. Never claims upload or indexing. */
function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        Error(
          "Trình duyệt không hỗ trợ lưu tệp. Vui lòng dùng trình duyệt hỗ trợ IndexedDB.",
        ),
      );
      return;
    }
    const request = indexedDB.open("kma-knowledge-files-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        Error(
          "Không thể mở bộ lưu tệp. Kiểm tra quyền lưu dữ liệu của trình duyệt.",
        ),
      );
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openFiles();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode),
      request = operation(tx.objectStore("files"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        Error("Không thể lưu hoặc đọc tệp. Có thể bộ nhớ trình duyệt đã đầy."),
      );
    };
  });
}
export const putSourceFile = (id: number, file: Blob) =>
  transaction("readwrite", (store) => store.put(file, id));
export const getSourceFile = (id: number) =>
  transaction<Blob | undefined>("readonly", (store) => store.get(id));
export const removeSourceFile = (id: number) =>
  transaction("readwrite", (store) => store.delete(id));
