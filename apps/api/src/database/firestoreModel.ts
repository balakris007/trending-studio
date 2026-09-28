import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDb } from '../config/firebase';

function getLocalStoreFile(): string {
  const candidates = [
    path.resolve(process.cwd(), '.firestore_local.json'),
    path.resolve(process.cwd(), 'apps/api/.firestore_local.json'),
    path.resolve(__dirname, '../../.firestore_local.json'),
    path.resolve(__dirname, '../../../.firestore_local.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(process.cwd(), '.firestore_local.json');
}

const inMemoryStore: Record<string, Map<string, any>> = {};
let isLoaded = false;

function loadLocalStore() {
  if (isLoaded) return;
  isLoaded = true;
  try {
    const filePath = getLocalStoreFile();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      for (const col of Object.keys(data)) {
        inMemoryStore[col] = new Map();
        for (const [id, doc] of Object.entries(data[col])) {
          inMemoryStore[col].set(id, doc);
        }
      }
    }
  } catch (err) {
    // Ignore parse error
  }
}

function persistLocalStore() {
  try {
    const serialized: Record<string, Record<string, any>> = {};
    for (const col of Object.keys(inMemoryStore)) {
      serialized[col] = {};
      for (const [id, doc] of inMemoryStore[col].entries()) {
        serialized[col][id] = doc;
      }
    }
    const json = JSON.stringify(serialized, null, 2);
    
    // Save to active path as well as root and apps/api locations
    const targetPaths = Array.from(new Set([
      getLocalStoreFile(),
      path.resolve(process.cwd(), '.firestore_local.json'),
      path.resolve(process.cwd(), 'apps/api/.firestore_local.json'),
      path.resolve(__dirname, '../../.firestore_local.json'),
    ]));

    for (const p of targetPaths) {
      try {
        fs.writeFileSync(p, json, 'utf8');
      } catch {}
    }
  } catch (err) {
    // Ignore write error
  }
}

export function getMemoryStore(): Record<string, Map<string, any>> {
  loadLocalStore();
  return inMemoryStore;
}

function getMemoryCollection(name: string): Map<string, any> {
  loadLocalStore();
  if (!inMemoryStore[name]) {
    inMemoryStore[name] = new Map();
  }
  return inMemoryStore[name];
}

export class FirestoreDocument<T = any> {
  [key: string]: any;
  public _collectionName: string;

  constructor(collectionName: string, data: any = {}) {
    this._collectionName = collectionName;
    Object.assign(this, data);
    this._id = data._id || data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.id = this._id;
  }

  public async save(): Promise<this> {
    const db = getDb();
    const cleanData: any = {};

    for (const key of Object.keys(this)) {
      if (key === '_collectionName') continue;
      const val = this[key];
      cleanData[key] = val === undefined ? null : val;
    }

    cleanData.updatedAt = new Date().toISOString();
    if (!cleanData.createdAt) {
      cleanData.createdAt = cleanData.updatedAt;
    }

    if (db) {
      try {
        await db.collection(this._collectionName).doc(this._id).set(cleanData, { merge: true });
      } catch (err: any) {
        const mem = getMemoryCollection(this._collectionName);
        mem.set(this._id, cleanData);
        persistLocalStore();
      }
    } else {
      const mem = getMemoryCollection(this._collectionName);
      mem.set(this._id, cleanData);
      persistLocalStore();
    }

    return this;
  }

  public async comparePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  public select(fields?: string): this {
    if (fields) {
      const excluded = fields.split(' ').map((f) => f.trim()).filter(Boolean).filter((s) => s.startsWith('-')).map((s) => s.substring(1));
      for (const ex of excluded) {
        delete this[ex];
      }
    }
    return this;
  }

  public populate(fields?: string): this {
    return this;
  }
}

export class FirestoreQuery<T = any> {
  private _collectionName: string;
  private _filter: any;
  private _sort?: Record<string, 1 | -1>;
  private _skip?: number;
  private _limit?: number;
  private _select?: string[];

  constructor(collectionName: string, filter: any = {}) {
    this._collectionName = collectionName;
    this._filter = filter;
  }

  public sort(sortObj: Record<string, 1 | -1>): this {
    this._sort = sortObj;
    return this;
  }

  public skip(n: number): this {
    this._skip = n;
    return this;
  }

  public limit(n: number): this {
    this._limit = n;
    return this;
  }

  public select(fields: string): this {
    this._select = fields.split(' ').map((f) => f.trim()).filter(Boolean);
    return this;
  }

  public lean(): this {
    return this;
  }

  private matchesFilter(doc: any, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;

    if (filter.$or && Array.isArray(filter.$or)) {
      const orMatched = filter.$or.some((sub: any) => this.matchesFilter(doc, sub));
      if (!orMatched) return false;
    }

    for (const key of Object.keys(filter)) {
      if (key === '$or') continue;
      const condition = filter[key];

      if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
        if (condition.$regex) {
          const reg = new RegExp(condition.$regex, condition.$options || '');
          const val = doc[key] ? String(doc[key]) : '';
          if (!reg.test(val)) return false;
          continue;
        }
        if (condition.$gte !== undefined && doc[key] < condition.$gte) return false;
        if (condition.$lte !== undefined && doc[key] > condition.$lte) return false;
        if (condition.$gt !== undefined && doc[key] <= condition.$gt) return false;
        if (condition.$lt !== undefined && doc[key] >= condition.$lt) return false;
        if (condition.$in && Array.isArray(condition.$in) && !condition.$in.includes(doc[key])) return false;
      } else {
        if (doc[key] !== condition) {
          if (String(doc[key]) !== String(condition)) return false;
        }
      }
    }

    return true;
  }

  public async exec(): Promise<FirestoreDocument<T>[]> {
    const db = getDb();
    let docs: any[] = [];

    if (db) {
      try {
        const snapshot = await db.collection(this._collectionName).get();
        docs = snapshot.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
      } catch (err) {
        const mem = getMemoryCollection(this._collectionName);
        docs = Array.from(mem.values());
      }
    } else {
      const mem = getMemoryCollection(this._collectionName);
      docs = Array.from(mem.values());
    }

    let filtered = docs.filter((d) => this.matchesFilter(d, this._filter));

    if (this._sort) {
      const [field, direction] = Object.entries(this._sort)[0];
      filtered.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA < valB) return direction === 1 ? -1 : 1;
        if (valA > valB) return direction === 1 ? 1 : -1;
        return 0;
      });
    }

    if (this._skip) {
      filtered = filtered.slice(this._skip);
    }
    if (this._limit) {
      filtered = filtered.slice(0, this._limit);
    }

    if (this._select && this._select.length > 0) {
      const excluded = this._select.filter((s) => s.startsWith('-')).map((s) => s.substring(1));
      if (excluded.length > 0) {
        filtered = filtered.map((d) => {
          const clone = { ...d };
          for (const ex of excluded) delete clone[ex];
          return clone;
        });
      }
    }

    return filtered.map((d) => new FirestoreDocument<T>(this._collectionName, d));
  }

  public then<TResult1 = FirestoreDocument<T>[], TResult2 = never>(
    onfulfilled?: ((value: FirestoreDocument<T>[]) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export class FirestoreQuerySingle<T = any> {
  private _collectionName: string;
  private _id: string;
  private _selectFields: string[] = [];

  constructor(collectionName: string, id: string) {
    this._collectionName = collectionName;
    this._id = id;
  }

  public select(fields: string): this {
    this._selectFields = fields.split(' ').map((f) => f.trim()).filter(Boolean);
    return this;
  }

  public populate(fields?: string): this {
    return this;
  }

  public lean(): this {
    return this;
  }

  public async exec(): Promise<FirestoreDocument<T> | null> {
    if (!this._id) return null;
    const db = getDb();
    let docData: any = null;

    if (db) {
      try {
        const docRef = db.collection(this._collectionName).doc(this._id);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          docData = {
            ...docSnap.data(),
            _id: docSnap.id,
            id: docSnap.id,
          };
        }
      } catch (err) {}
    }

    if (!docData) {
      const mem = getMemoryCollection(this._collectionName);
      docData = mem.get(this._id);
    }

    if (!docData) return null;

    const doc = new FirestoreDocument<T>(this._collectionName, docData);
    if (this._selectFields.length > 0) {
      const excluded = this._selectFields.filter((s) => s.startsWith('-')).map((s) => s.substring(1));
      for (const ex of excluded) {
        delete doc[ex];
      }
    }
    return doc;
  }

  public then<TResult1 = FirestoreDocument<T> | null, TResult2 = never>(
    onfulfilled?: ((value: FirestoreDocument<T> | null) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export function createFirestoreModel<T = any>(collectionName: string): any {
  class ModelClass extends FirestoreDocument<T> {
    constructor(data: any = {}) {
      super(collectionName, data);
    }

    public static collectionName = collectionName;

    public static findById(id: string): FirestoreQuerySingle<T> {
      return new FirestoreQuerySingle<T>(collectionName, id);
    }

    public static async findOne(filter: any = {}): Promise<FirestoreDocument<T> | null> {
      const results = await new FirestoreQuery<T>(collectionName, filter).limit(1).exec();
      return results.length > 0 ? results[0] : null;
    }

    public static find(filter: any = {}): FirestoreQuery<T> {
      return new FirestoreQuery<T>(collectionName, filter);
    }

    public static async create(data: any): Promise<any> {
      if (Array.isArray(data)) {
        return this.insertMany(data);
      }

      const db = getDb();
      const id = data._id || data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const fullData = {
        ...data,
        _id: id,
        id,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };

      if (fullData.password && !fullData.password.startsWith('$2')) {
        fullData.password = await bcrypt.hash(fullData.password, 10);
      }

      for (const key of Object.keys(fullData)) {
        if (fullData[key] === undefined) {
          fullData[key] = null;
        }
      }

      if (db) {
        try {
          await db.collection(collectionName).doc(id).set(fullData);
        } catch (err) {}
      }

      const mem = getMemoryCollection(collectionName);
      mem.set(id, fullData);
      persistLocalStore();

      return new FirestoreDocument<T>(collectionName, fullData);
    }

    public static async insertMany(items: any[]): Promise<FirestoreDocument<T>[]> {
      const results: FirestoreDocument<T>[] = [];
      for (const item of items) {
        const doc = await this.create(item);
        results.push(doc);
      }
      return results;
    }

    public static async findByIdAndUpdate(
      id: string,
      update: any,
      options: { new?: boolean; upsert?: boolean } = {}
    ): Promise<FirestoreDocument<T> | null> {
      let doc = await this.findById(id);

      if (!doc && options.upsert) {
        const data = { _id: id, ...update };
        if (update.$inc) {
          for (const [key, incVal] of Object.entries(update.$inc)) {
            data[key] = (data[key] || 0) + Number(incVal);
          }
          delete data.$inc;
        }
        return this.create(data);
      }

      if (!doc) return null;

      if (update.$inc) {
        for (const [key, incVal] of Object.entries(update.$inc)) {
          doc[key] = (doc[key] || 0) + Number(incVal);
        }
        delete update.$inc;
      }

      Object.assign(doc, update);
      await doc.save();
      return doc;
    }

    public static async countDocuments(filter: any = {}): Promise<number> {
      const results = await this.find(filter).exec();
      return results.length;
    }

    public static async deleteMany(filter: any = {}): Promise<{ deletedCount: number }> {
      const db = getDb();
      const docs = await this.find(filter).exec();
      let count = 0;

      for (const d of docs) {
        if (db) {
          try {
            await db.collection(collectionName).doc(d._id).delete();
          } catch {}
        }
        const mem = getMemoryCollection(collectionName);
        mem.delete(d._id);
        count++;
      }

      persistLocalStore();
      return { deletedCount: count };
    }

    public static async deleteOne(filter: any = {}): Promise<{ deletedCount: number }> {
      const doc = await this.findOne(filter);
      if (!doc) return { deletedCount: 0 };
      const db = getDb();
      if (db) {
        try {
          await db.collection(collectionName).doc(doc._id).delete();
        } catch {}
      }
      const mem = getMemoryCollection(collectionName);
      mem.delete(doc._id);
      persistLocalStore();
      return { deletedCount: 1 };
    }
  }

  return ModelClass;
}
