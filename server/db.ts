import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getCityCoordinates } from '../src/data/catalog.ts';
import type {
  AuthUser,
  ChatMessage,
  NotificationItem,
  Product,
  StoreProfile,
  TrackingRecord,
  TradeInRequest,
  VerifiedReview,
  WishlistItem,
} from '../src/types.ts';

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'customer' | 'store_owner';
  storeId?: string;
  city?: string;
  district?: string;
  lat?: number;
  lng?: number;
  authProvider?: 'local' | 'firebase';
}

export interface DatabaseState {
  users: StoredUserRecord[];
  stores: StoreProfile[];
  products: Product[];
  bookings: TrackingRecord[];
  messages: ChatMessage[];
  reviews: VerifiedReview[];
  wishlists: WishlistItem[];
  notifications: NotificationItem[];
  tradeins: TradeInRequest[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'technophone-db.json');
const TOKEN_SECRET =
  process.env.AUTH_SECRET || 'techno-phone-local-session-secret-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function createSessionToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      city: user.city,
      district: user.district,
      lat: user.lat,
      lng: user.lng,
      authProvider: user.authProvider || 'local',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    }),
    'utf-8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payload)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    ) as AuthUser & { exp: number };
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      storeId: decoded.storeId,
      city: decoded.city,
      district: decoded.district,
      lat: decoded.lat,
      lng: decoded.lng,
      authProvider: decoded.authProvider || 'local',
    };
  } catch {
    return null;
  }
}

function buildEmptyState(): DatabaseState {
  return {
    users: [],
    stores: [],
    products: [],
    bookings: [],
    messages: [],
    reviews: [],
    wishlists: [],
    notifications: [],
    tradeins: [],
  };
}

let cachedDb: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;

      const normalized: DatabaseState = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        stores: Array.isArray(parsed.stores) ? parsed.stores : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        wishlists: Array.isArray(parsed.wishlists) ? parsed.wishlists : [],
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications
          : [],
        tradeins: Array.isArray(parsed.tradeins) ? parsed.tradeins : [],
      };

      normalized.stores = normalized.stores.map((store) => {
        const coords = getCityCoordinates(store.city);
        return {
          ...store,
          lat: typeof store.lat === 'number' ? store.lat : coords.lat,
          lng: typeof store.lng === 'number' ? store.lng : coords.lng,
          district: store.district || '',
          specialties: Array.isArray(store.specialties) ? store.specialties : [],
          verificationStatus:
            store.verificationStatus || (store.verified ? 'verified' : 'unverified'),
          avgRating: typeof store.avgRating === 'number' ? store.avgRating : 5.0,
          reviewCount: typeof store.reviewCount === 'number' ? store.reviewCount : 0,
          technicians: Array.isArray(store.technicians) ? store.technicians : [],
          promoCodes: Array.isArray(store.promoCodes) ? store.promoCodes : [],
        };
      });

      cachedDb = normalized;
      return cachedDb;
    } catch {
      cachedDb = buildEmptyState();
      saveDb(cachedDb);
      return cachedDb;
    }
  }
  cachedDb = buildEmptyState();
  saveDb(cachedDb);
  return cachedDb;
}

export function saveDb(next: DatabaseState): void {
  cachedDb = next;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(next, null, 2), 'utf-8');
}
