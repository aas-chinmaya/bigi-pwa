import Dexie, { type Table } from "dexie";

export interface OfflineInvoice {
  localId: string;
  userId: string;
  payload: any;
  createdAt: number;
  syncStatus: "pending" | "syncing" | "failed" | "synced";
  serverId?: string;
  lastError?: string;
}

export interface CacheRow {
  key: string;
  userId: string;
  type: "invoices" | "business" | "customers" | "items";
  data: any;
  at: number;
}

class DB extends Dexie {
  offline!: Table<OfflineInvoice, string>;
  cache!: Table<CacheRow, string>;
  constructor() {
    super("invoiceflow");
    this.version(1).stores({
      offline: "localId,userId,syncStatus",
      cache: "key,userId,type",
    });
    this.version(2).stores({
      offline: "localId,userId,syncStatus",
      cache: "key,userId,type",
    });
  }
}

let _db: DB | null = null;
export const getDb = () => (_db ??= new DB());

export async function saveOffline(localId: string, userId: string, payload: any) {
  await getDb().offline.put({
    localId, userId, payload, createdAt: Date.now(), syncStatus: "pending",
  });
}

export async function setCache(userId: string, type: CacheRow["type"], data: any) {
  await getDb().cache.put({ key: `${userId}:${type}`, userId, type, data, at: Date.now() });
}

export async function getCache(userId: string, type: CacheRow["type"]) {
  const row = await getDb().cache.get(`${userId}:${type}`);
  return row?.data;
}

export async function clearAll() {
  try { await getDb().delete(); _db = null; } catch {}
}
