// IndexedDB Cache Helper for large data storage
// Supports much larger data than sessionStorage (5MB limit)

const DB_NAME = 'ThailifeDashboardCache';
const DB_VERSION = 1;
const STORE_NAME = 'dataCache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

let db = null;

const openDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.warn('IndexedDB open failed');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
};

export const getCachedData = async (key) => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (result && (Date.now() - result.timestamp < CACHE_TTL)) {
                    console.log(`DEBUG: Cache HIT for ${key} (${result.data?.length || 0} rows)`);
                    resolve(result.data);
                } else {
                    console.log(`DEBUG: Cache MISS for ${key}`);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.warn('IndexedDB get failed');
                resolve(null);
            };
        });
    } catch (e) {
        console.warn('IndexedDB error:', e);
        return null;
    }
};

export const setCachedData = async (key, data) => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({
                key,
                data,
                timestamp: Date.now()
            });

            request.onsuccess = () => {
                console.log(`DEBUG: Cached ${data?.length || 0} rows for ${key}`);
                resolve(true);
            };

            request.onerror = () => {
                console.warn('IndexedDB put failed');
                resolve(false);
            };
        });
    } catch (e) {
        console.warn('IndexedDB error:', e);
        return false;
    }
};

export const clearCache = async () => {
    try {
        const database = await openDB();
        return new Promise((resolve) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('DEBUG: Cache cleared');
                resolve(true);
            };

            request.onerror = () => resolve(false);
        });
    } catch (e) {
        return false;
    }
};
