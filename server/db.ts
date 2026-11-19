import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  INITIAL_STORES,
  INITIAL_TRACKING_RECORDS,
  getCityCoordinates,
} from '../src/data/catalog.ts';
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
      authProvider: 'local',
    };
  } catch {
    return null;
  }
}

function buildSeedState(): DatabaseState {
  const demoUsers: StoredUserRecord[] = [
    {
      id: 'owner-techno-baghdad',
      name: 'م. حيدر الكاظمي (مدير فرع المنصور)',
      email: 'baghdad@technophone.iq',
      passwordHash: hashPassword('123456'),
      role: 'store_owner',
      storeId: 'store-techno-baghdad',
    },
    {
      id: 'owner-spectrum-basra',
      name: 'أ. مهند التميمي (متجر سبيكتروم)',
      email: 'basra@spectrum.iq',
      passwordHash: hashPassword('123456'),
      role: 'store_owner',
      storeId: 'store-spectrum-basra',
    },
    {
      id: 'customer-demo',
      name: 'كرار الربيعي',
      email: 'customer@technophone.iq',
      passwordHash: hashPassword('123456'),
      role: 'customer',
      city: 'بغداد',
      district: 'المنصور',
      lat: 33.3152,
      lng: 44.3661,
    },
  ];

  const seedMessages: ChatMessage[] = [
    {
      id: 'msg-seed-1',
      storeId: 'store-techno-baghdad',
      customerSessionId: 'demo-thread-1',
      customerName: 'علي الدليمي',
      senderRole: 'customer',
      text: 'السلام عليكم، هل يتوفر آيفون 16 برو تيتانيوم سعة 512 جيجابايت للاستلام اليوم من فرع المنصور؟',
      createdAt: '10:20 ص',
    },
    {
      id: 'msg-seed-2',
      storeId: 'store-techno-baghdad',
      customerSessionId: 'demo-thread-1',
      customerName: 'علي الدليمي',
      senderRole: 'store_owner',
      text: 'وعليكم السلام أهلاً بك، نعم متوفر وجاهز للاستلام الفوري من فرع المنصور أو الحجز عبر صفحة المنتج.',
      createdAt: '10:24 ص',
    },
  ];

  const seedWishlists: WishlistItem[] = [
    {
      id: 'wish-seed-1',
      customerId: 'customer-demo',
      productId: 'tp-iphone-16-pro',
      storeId: 'store-techno-baghdad',
      savedPrice: 1790000,
      notifyPriceDrop: true,
      createdAt: '2026-11-15',
    },
  ];

  const seedNotifications: NotificationItem[] = [
    {
      id: 'notif-seed-1',
      userId: 'customer-demo',
      senderId: 'owner-techno-baghdad',
      title: 'تم إصدار بطاقة الضمان الإلكترونية لطلبك ORD-2026-4120',
      body: 'اكتمل تسليم آيفون 16 برو تيتانيوم بنجاح. يمكنك الآن عرض بطاقة الضمان بـ QR وتقييم المتجر.',
      type: 'stage_update',
      relatedId: 'ORD-2026-4120',
      read: false,
      createdAt: 'اليوم 09:10 ص',
    },
    {
      id: 'notif-seed-2',
      userId: 'customer-demo',
      senderId: 'owner-techno-baghdad',
      title: 'انخفض سعر جهاز في مفضلتك!',
      body: 'انخفض سعر آيفون 16 برو تيتانيوم إلى 1,650,000 د.ع بدلاً من 1,790,000 د.ع.',
      type: 'price_drop',
      relatedId: 'tp-iphone-16-pro',
      read: false,
      createdAt: 'اليوم 10:00 ص',
    },
  ];

  const seedTradeIns: TradeInRequest[] = [
    {
      id: 'TRD-2026-310',
      storeId: 'store-techno-baghdad',
      storeOwnerId: 'owner-techno-baghdad',
      storeName: 'تكنو فون — فرع المنصور الرئيسي',
      customerId: 'customer-demo',
      customerName: 'كرار الربيعي',
      phone: '07714582901',
      deviceType: 'smartphone',
      model: 'iPhone 13 Pro',
      storage: '256 جيجابايت',
      batteryHealth: 87,
      conditionNotes: 'نظيف جداً مع الكرتونة الأصلية، بدون خدوش أو فتح صيانة.',
      imei: '351982047123456',
      estimatedValue: 620000,
      offeredValue: 640000,
      targetProductId: 'tp-iphone-16-pro',
      targetProductName: 'آيفون 16 برو تيتانيوم',
      status: 'quoted',
      storeNotes: 'تقييم ممتاز بعد مراجعة المواصفات؛ العرض سارٍ لمدة 48 ساعة في فرع المنصور.',
      createdAt: '2026-11-16 16:30',
    },
  ];

  return {
    users: demoUsers,
    stores: INITIAL_STORES,
    products: INITIAL_PRODUCTS,
    bookings: INITIAL_TRACKING_RECORDS,
    messages: seedMessages,
    reviews: INITIAL_REVIEWS,
    wishlists: seedWishlists,
    notifications: seedNotifications,
    tradeins: seedTradeIns,
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
      const parsed = JSON.parse(raw) as DatabaseState;
      const isLegacySeed = parsed.stores.some(
        (s) => s.id === 'store-techno-riyadh'
      );
      if (isLegacySeed) {
        cachedDb = buildSeedState();
        saveDb(cachedDb);
        return cachedDb;
      }

      let migrated = false;
      const seed = buildSeedState();

      parsed.stores = parsed.stores.map((store) => {
        const seeded = INITIAL_STORES.find((s) => s.id === store.id);
        const coords = seeded
          ? { lat: seeded.lat, lng: seeded.lng }
          : getCityCoordinates(store.city);
        const needsUpdate =
          typeof store.lat !== 'number' ||
          typeof store.lng !== 'number' ||
          !store.verificationStatus ||
          !Array.isArray(store.technicians);
        if (needsUpdate) migrated = true;
        return {
          ...store,
          lat: typeof store.lat === 'number' ? store.lat : coords.lat,
          lng: typeof store.lng === 'number' ? store.lng : coords.lng,
          district: store.district || seeded?.district || '',
          verificationStatus:
            store.verificationStatus || (store.verified ? 'verified' : 'unverified'),
          avgRating:
            typeof store.avgRating === 'number'
              ? store.avgRating
              : seeded?.avgRating ?? 4.8,
          reviewCount:
            typeof store.reviewCount === 'number'
              ? store.reviewCount
              : seeded?.reviewCount ?? 0,
          technicians: Array.isArray(store.technicians)
            ? store.technicians
            : seeded?.technicians || [],
          promoCodes: Array.isArray(store.promoCodes)
            ? store.promoCodes
            : seeded?.promoCodes || [],
        };
      });

      // Backfill enriched seed products & fields
      for (const seedProd of INITIAL_PRODUCTS) {
        const idx = parsed.products.findIndex((p) => p.id === seedProd.id);
        if (idx === -1) {
          parsed.products.push(seedProd);
          migrated = true;
        } else if (
          seedProd.batteryHealth &&
          parsed.products[idx].batteryHealth === undefined
        ) {
          parsed.products[idx] = { ...seedProd, ...parsed.products[idx] };
          migrated = true;
        }
      }

      // Backfill seed bookings
      for (const seedBooking of INITIAL_TRACKING_RECORDS) {
        const idx = parsed.bookings.findIndex((b) => b.id === seedBooking.id);
        if (idx === -1) {
          parsed.bookings.push(seedBooking);
          migrated = true;
        } else if (
          seedBooking.warrantyQrCodeData &&
          !parsed.bookings[idx].warrantyQrCodeData
        ) {
          parsed.bookings[idx] = { ...seedBooking, ...parsed.bookings[idx] };
          migrated = true;
        }
      }

      if (!Array.isArray(parsed.reviews)) {
        parsed.reviews = seed.reviews;
        migrated = true;
      }
      if (!Array.isArray(parsed.wishlists)) {
        parsed.wishlists = seed.wishlists;
        migrated = true;
      }
      if (!Array.isArray(parsed.notifications)) {
        parsed.notifications = seed.notifications;
        migrated = true;
      }
      if (!Array.isArray(parsed.tradeins)) {
        parsed.tradeins = seed.tradeins;
        migrated = true;
      }

      parsed.users = parsed.users.map((u) => {
        if (
          u.role === 'customer' &&
          (!u.city || typeof u.lat !== 'number' || typeof u.lng !== 'number')
        ) {
          migrated = true;
          const fallbackCity = u.city || 'بغداد';
          const coords = getCityCoordinates(fallbackCity);
          return {
            ...u,
            city: fallbackCity,
            district: u.district || '',
            lat: typeof u.lat === 'number' ? u.lat : coords.lat,
            lng: typeof u.lng === 'number' ? u.lng : coords.lng,
          };
        }
        return u;
      });

      cachedDb = parsed;
      if (migrated) {
        saveDb(cachedDb);
      }
      return cachedDb;
    } catch {
      cachedDb = buildSeedState();
      saveDb(cachedDb);
      return cachedDb;
    }
  }
  cachedDb = buildSeedState();
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
