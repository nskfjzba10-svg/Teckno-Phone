import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { buildWarrantyQrData, getCityCoordinates } from '../data/catalog';
import {
  AuthUser,
  ChatMessage,
  ConversationThread,
  NotificationItem,
  Product,
  PromoCode,
  StoreAnalytics,
  StoreProfile,
  StoreTechnician,
  TicketStage,
  TrackingRecord,
  TradeInRequest,
  UserRole,
  VerifiedReview,
  WishlistItem,
} from '../types';
import { apiRequest, getAuthToken, isBackendUnavailable } from './api';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from './firebase';

export const FIREBASE_DIRECT_TOKEN = 'firebase-direct';

const DEFAULT_STORE_LOGO =
  '/src/assets/images/product_titanium_phone_1794983260872.jpg';

const CATEGORY_LABELS: Record<Product['category'], string> = {
  smartphones: 'هواتف ذكية',
  laptops_tablets: 'لابتوب وتابلت',
  audio_watches: 'ساعات وسماعات',
  accessories: 'شواحن وإكسسوارات',
};

const CATEGORY_DEFAULT_IMAGE: Record<Product['category'], string> = {
  smartphones: '/src/assets/images/product_titanium_phone_1794983260872.jpg',
  laptops_tablets: '/src/assets/images/product_pro_laptop_1794983261756.jpg',
  audio_watches: '/src/assets/images/product_smartwatch_audio_1794983264111.jpg',
  accessories: '/src/assets/images/product_gan_accessories_1794983264416.jpg',
};

export function isDirectFirebaseSession(): boolean {
  return getAuthToken() === FIREBASE_DIRECT_TOKEN;
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-');
  return cleaned.length >= 2 ? cleaned.slice(0, 128) : `id-${cleaned}`;
}

function clampString(
  raw: string | undefined | null,
  fallback: string,
  minLen: number,
  maxLen: number
): string {
  const cleaned = (raw || '').trim();
  const base = cleaned.length >= minLen ? cleaned : fallback;
  return base.slice(0, maxLen);
}

function formatFsDateTime(val: unknown): string {
  if (!val) return new Date().toISOString().slice(0, 16).replace('T', ' ');
  if (val instanceof Timestamp) {
    const d = val.toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const sec = Number((val as { seconds: number }).seconds || 0);
    const d = new Date(sec * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function mapDocToStore(raw: Record<string, unknown>): StoreProfile {
  return {
    id: String(raw.id || ''),
    ownerId: String(raw.ownerId || ''),
    name: String(raw.name || ''),
    logo: String(raw.logo || DEFAULT_STORE_LOGO),
    city: String(raw.city || 'بغداد'),
    district: raw.district ? String(raw.district) : undefined,
    address: String(raw.address || ''),
    phone: String(raw.phone || ''),
    workingHours: String(raw.workingHours || '10:00 صباحاً – 10:30 مساءً'),
    description: String(raw.description || ''),
    specialties: Array.isArray(raw.specialties)
      ? raw.specialties.map(String)
      : [],
    lat: typeof raw.lat === 'number' ? raw.lat : 33.3152,
    lng: typeof raw.lng === 'number' ? raw.lng : 44.3661,
    verified: Boolean(raw.verified),
    verificationStatus: (raw.verificationStatus as StoreProfile['verificationStatus']) || 'unverified',
    licenseDocUrl: raw.licenseDocUrl ? String(raw.licenseDocUrl) : undefined,
    avgRating: typeof raw.avgRating === 'number' ? raw.avgRating : 5,
    reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
    technicians: Array.isArray(raw.technicians)
      ? (raw.technicians as StoreTechnician[])
      : [],
    promoCodes: Array.isArray(raw.promoCodes)
      ? (raw.promoCodes as PromoCode[])
      : [],
    createdAt: formatFsDateTime(raw.createdAt),
  };
}

function mapDocToProduct(raw: Record<string, unknown>): Product {
  const category = (raw.category as Product['category']) || 'smartphones';
  return {
    id: String(raw.id || ''),
    storeId: String(raw.storeId || ''),
    ownerId: raw.ownerId ? String(raw.ownerId) : undefined,
    storeName: String(raw.storeName || ''),
    name: String(raw.name || ''),
    brand: String(raw.brand || ''),
    category,
    categoryLabel: String(raw.categoryLabel || CATEGORY_LABELS[category] || 'هواتف ذكية'),
    price: Number(raw.price || 0),
    oldPrice: typeof raw.oldPrice === 'number' ? raw.oldPrice : undefined,
    condition: (raw.condition as Product['condition']) || 'جديد',
    inStock: raw.inStock !== false,
    warrantyMonths: Number(raw.warrantyMonths ?? 12),
    image: String(raw.image || CATEGORY_DEFAULT_IMAGE[category]),
    extraImages: Array.isArray(raw.extraImages)
      ? raw.extraImages.map(String)
      : undefined,
    imei: raw.imei ? String(raw.imei) : undefined,
    batteryHealth:
      typeof raw.batteryHealth === 'number' ? raw.batteryHealth : undefined,
    previouslyOpened:
      typeof raw.previouslyOpened === 'boolean'
        ? raw.previouslyOpened
        : undefined,
    summary: String(raw.summary || ''),
    specs: Array.isArray(raw.specs)
      ? (raw.specs as { label: string; value: string }[])
      : [],
    storageOptions: Array.isArray(raw.storageOptions)
      ? (raw.storageOptions as Product['storageOptions'])
      : [{ label: 'قياسي', priceDelta: 0 }],
    colors: Array.isArray(raw.colors)
      ? (raw.colors as Product['colors'])
      : [{ name: 'قياسي', hex: '#1e293b' }],
  };
}

function mapDocToBooking(raw: Record<string, unknown>): TrackingRecord {
  const labels = Array.isArray(raw.stageLabels) && raw.stageLabels.length === 4
    ? (raw.stageLabels.map(String) as [string, string, string, string])
    : (['استلام الطلب', 'جاري التجهيز', 'جاهز للتسليم', 'مكتمل'] as [
        string,
        string,
        string,
        string,
      ]);
  return {
    id: String(raw.id || ''),
    kind: (raw.kind as TrackingRecord['kind']) || 'order',
    storeId: String(raw.storeId || ''),
    storeOwnerId: raw.storeOwnerId ? String(raw.storeOwnerId) : undefined,
    storeName: String(raw.storeName || ''),
    customerId: raw.customerId ? String(raw.customerId) : undefined,
    customerName: String(raw.customerName || ''),
    phone: String(raw.phone || ''),
    governorate: raw.governorate ? String(raw.governorate) : undefined,
    district: raw.district ? String(raw.district) : undefined,
    title: String(raw.title || ''),
    subtitle: String(raw.subtitle || ''),
    createdAt: formatFsDateTime(raw.createdAt),
    stage: (Number(raw.stage || 1) as TicketStage) || 1,
    stageLabels: labels,
    estimatedReady: String(raw.estimatedReady || ''),
    totalPrice: Number(raw.totalPrice || 0),
    deliveryFee:
      typeof raw.deliveryFee === 'number' ? raw.deliveryFee : undefined,
    discountAmount:
      typeof raw.discountAmount === 'number' ? raw.discountAmount : undefined,
    promoCode: raw.promoCode ? String(raw.promoCode) : undefined,
    notes: String(raw.notes || ''),
    warrantyLabel: String(raw.warrantyLabel || 'ضمان المتجر المعتمد'),
    assignedTechnician: raw.assignedTechnician
      ? String(raw.assignedTechnician)
      : undefined,
    technicianReport: raw.technicianReport
      ? String(raw.technicianReport)
      : undefined,
    faultMediaUrls: Array.isArray(raw.faultMediaUrls)
      ? raw.faultMediaUrls.map(String)
      : undefined,
    warrantyQrCodeData: raw.warrantyQrCodeData
      ? String(raw.warrantyQrCodeData)
      : undefined,
    reviewed: Boolean(raw.reviewed),
  };
}

function mapDocToReview(raw: Record<string, unknown>): VerifiedReview {
  return {
    id: String(raw.id || ''),
    storeId: String(raw.storeId || ''),
    bookingId: String(raw.bookingId || ''),
    productId: raw.productId ? String(raw.productId) : undefined,
    customerId: String(raw.customerId || ''),
    customerName: String(raw.customerName || ''),
    rating: Number(raw.rating || 5),
    comment: String(raw.comment || ''),
    verifiedPurchase: true,
    createdAt: formatFsDateTime(raw.createdAt),
  };
}

function mapDocToTradeIn(raw: Record<string, unknown>): TradeInRequest {
  return {
    id: String(raw.id || ''),
    storeId: String(raw.storeId || ''),
    storeOwnerId: raw.storeOwnerId ? String(raw.storeOwnerId) : undefined,
    storeName: String(raw.storeName || 'متجر معتمد'),
    customerId: String(raw.customerId || ''),
    customerName: String(raw.customerName || ''),
    phone: String(raw.phone || ''),
    deviceType: 'smartphone',
    model: String(raw.model || ''),
    storage: String(raw.storage || ''),
    batteryHealth: Number(raw.batteryHealth ?? 85),
    conditionNotes: String(raw.conditionNotes || ''),
    imei: raw.imei ? String(raw.imei) : undefined,
    photoUrl: raw.photoUrl ? String(raw.photoUrl) : undefined,
    estimatedValue: Number(raw.estimatedValue || 0),
    offeredValue:
      typeof raw.offeredValue === 'number' ? raw.offeredValue : undefined,
    targetProductId: raw.targetProductId
      ? String(raw.targetProductId)
      : undefined,
    status: (raw.status as TradeInRequest['status']) || 'pending',
    storeNotes: raw.storeNotes ? String(raw.storeNotes) : undefined,
    createdAt: formatFsDateTime(raw.createdAt),
  };
}

export interface StoreDraftInput {
  storeName: string;
  logo: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  workingHours: string;
  description: string;
  specialties: string[];
  licenseDocUrl?: string;
  lat: number;
  lng: number;
}

export async function signInWithGoogleRole(opts: {
  role: UserRole;
  governorate?: string;
  district?: string;
  storeDraft?: StoreDraftInput;
}): Promise<{
  token: string;
  user: AuthUser;
  store: StoreProfile | null;
  isNew: boolean;
}> {
  const cred = await signInWithPopup(auth, googleProvider);
  const fbUser = cred.user;

  let cloudProfile: {
    user: AuthUser;
    store: StoreProfile | null;
    isNew: boolean;
  } | null = null;
  try {
    cloudProfile = await ensureFirebaseProfile(fbUser, opts);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('ROLE_MISMATCH:')) {
      await signOutFirebase();
      throw new Error(err.message.replace('ROLE_MISMATCH:', ''));
    }
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('client is offline')) {
      throw err;
    }
  }

  const idToken = await fbUser.getIdToken();
  try {
    const serverSession = await apiRequest<{
      token: string;
      user: AuthUser;
      store?: StoreProfile | null;
      isNew?: boolean;
    }>('/api/auth/firebase-session', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        role: opts.role,
        governorate: opts.governorate,
        district: opts.district,
        storeDraft: opts.storeDraft,
      }),
    });

    return {
      token: serverSession.token,
      user: serverSession.user,
      store: serverSession.store ?? cloudProfile?.store ?? null,
      isNew: serverSession.isNew ?? cloudProfile?.isNew ?? false,
    };
  } catch (err) {
    // On static hosting (404 / no Express backend), complete login cleanly via Firebase
    if (isBackendUnavailable(err)) {
      const resolvedProfile =
        cloudProfile || (await ensureFirebaseProfile(fbUser, opts));
      return {
        token: FIREBASE_DIRECT_TOKEN,
        user: resolvedProfile.user,
        store: resolvedProfile.store,
        isNew: resolvedProfile.isNew,
      };
    }
    await signOutFirebase();
    throw err;
  }
}

export async function loginWithEmailRole(opts: {
  email: string;
  password: string;
  expectedRole: UserRole;
}): Promise<{
  token: string;
  user: AuthUser;
  store: StoreProfile | null;
}> {
  try {
    const res = await apiRequest<{
      token: string;
      user: AuthUser;
      store?: StoreProfile | null;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: opts.email.trim(),
        password: opts.password,
      }),
    });
    return {
      token: res.token,
      user: res.user,
      store: res.store || null,
    };
  } catch (err) {
    if (!isBackendUnavailable(err)) {
      throw err;
    }

    // Static hosting fallback -> Firebase Email/Password Auth + Firestore profile
    const cred = await signInWithEmailAndPassword(
      auth,
      opts.email.trim(),
      opts.password
    );
    try {
      const profile = await ensureFirebaseProfile(cred.user, {
        role: opts.expectedRole,
      });
      return {
        token: FIREBASE_DIRECT_TOKEN,
        user: profile.user,
        store: profile.store,
      };
    } catch (profileErr) {
      if (
        profileErr instanceof Error &&
        profileErr.message.startsWith('ROLE_MISMATCH:')
      ) {
        await signOutFirebase();
        throw new Error(profileErr.message.replace('ROLE_MISMATCH:', ''));
      }
      throw profileErr;
    }
  }
}

export async function registerCustomerAccount(opts: {
  name: string;
  email: string;
  password: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
}): Promise<{
  token: string;
  user: AuthUser;
  store: null;
}> {
  try {
    const res = await apiRequest<{ token: string; user: AuthUser }>(
      '/api/auth/register-customer',
      {
        method: 'POST',
        body: JSON.stringify(opts),
      }
    );
    return { token: res.token, user: res.user, store: null };
  } catch (err) {
    if (!isBackendUnavailable(err)) {
      throw err;
    }

    // Static hosting fallback -> Firebase Email/Password Auth + Firestore
    const cred = await createUserWithEmailAndPassword(
      auth,
      opts.email.trim(),
      opts.password
    );
    try {
      await updateProfile(cred.user, { displayName: opts.name.trim() });
    } catch {
      // Non-critical
    }
    sendEmailVerification(cred.user).catch(() => {});

    const profile = await ensureFirebaseProfile(cred.user, {
      role: 'customer',
      displayNameOverride: opts.name.trim(),
      governorate: opts.city,
      district: opts.district,
      lat: opts.lat,
      lng: opts.lng,
    });
    return {
      token: FIREBASE_DIRECT_TOKEN,
      user: profile.user,
      store: null,
    };
  }
}

export async function registerStoreAccount(opts: {
  ownerName: string;
  email: string;
  password: string;
  storeName: string;
  logo: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  workingHours: string;
  description: string;
  specialties: string[];
  licenseDocUrl?: string;
  lat: number;
  lng: number;
}): Promise<{
  token: string;
  user: AuthUser;
  store: StoreProfile;
}> {
  try {
    const res = await apiRequest<{
      token: string;
      user: AuthUser;
      store: StoreProfile;
    }>('/api/auth/register-store', {
      method: 'POST',
      body: JSON.stringify(opts),
    });
    return res;
  } catch (err) {
    if (!isBackendUnavailable(err)) {
      throw err;
    }

    // Static hosting fallback -> Firebase Email/Password Auth + Firestore
    const cred = await createUserWithEmailAndPassword(
      auth,
      opts.email.trim(),
      opts.password
    );
    try {
      await updateProfile(cred.user, { displayName: opts.ownerName.trim() });
    } catch {
      // Non-critical
    }
    sendEmailVerification(cred.user).catch(() => {});

    const profile = await ensureFirebaseProfile(cred.user, {
      role: 'store_owner',
      displayNameOverride: opts.ownerName.trim(),
      governorate: opts.city,
      district: opts.district,
      lat: opts.lat,
      lng: opts.lng,
      storeDraft: {
        storeName: opts.storeName,
        logo: opts.logo,
        city: opts.city,
        district: opts.district,
        address: opts.address,
        phone: opts.phone,
        workingHours: opts.workingHours,
        description: opts.description,
        specialties: opts.specialties,
        licenseDocUrl: opts.licenseDocUrl,
        lat: opts.lat,
        lng: opts.lng,
      },
    });
    if (!profile.store) {
      throw new Error('تعذر إنشاء ملف المتجر في السحابة.');
    }
    return {
      token: FIREBASE_DIRECT_TOKEN,
      user: profile.user,
      store: profile.store,
    };
  }
}

export async function restoreFirebaseSession(): Promise<{
  user: AuthUser;
  store: StoreProfile | null;
} | null> {
  try {
    await auth.authStateReady();
  } catch {
    return null;
  }
  const fbUser = auth.currentUser;
  if (!fbUser) return null;

  const uid = sanitizeId(fbUser.uid);
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    const data = userSnap.data() as {
      id: string;
      name: string;
      role: UserRole;
      storeId?: string;
      governorate?: string;
      district?: string;
    };
    const city = data.governorate || 'بغداد';
    const coords = getCityCoordinates(city);
    let lat = coords.lat;
    let lng = coords.lng;

    try {
      const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
      if (privSnap.exists()) {
        const pData = privSnap.data() as { lat?: number; lng?: number };
        if (typeof pData.lat === 'number') lat = pData.lat;
        if (typeof pData.lng === 'number') lng = pData.lng;
      }
    } catch {
      // Optional private fields
    }

    let storeProfile: StoreProfile | null = null;
    if (data.role === 'store_owner' && data.storeId) {
      try {
        const sSnap = await getDoc(doc(db, 'stores', data.storeId));
        if (sSnap.exists()) {
          storeProfile = mapDocToStore(sSnap.data() as Record<string, unknown>);
        }
      } catch {
        // Ignore missing store
      }
    }

    return {
      user: {
        id: data.id,
        name: data.name,
        email: fbUser.email || '',
        role: data.role,
        storeId: data.storeId,
        city,
        district: data.district,
        lat,
        lng,
        authProvider: 'firebase',
      },
      store: storeProfile,
    };
  } catch {
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors
  }
}

export async function ensureFirebaseProfile(
  fbUser: FirebaseUser,
  opts: {
    role: UserRole;
    displayNameOverride?: string;
    governorate?: string;
    district?: string;
    lat?: number;
    lng?: number;
    storeDraft?: StoreDraftInput;
  }
): Promise<{ user: AuthUser; store: StoreProfile | null; isNew: boolean }> {
  const uid = sanitizeId(fbUser.uid);
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  if (existingSnap && existingSnap.exists()) {
    const data = existingSnap.data() as {
      id: string;
      name: string;
      role: UserRole;
      storeId?: string;
      governorate?: string;
      district?: string;
    };
    if (data.role !== opts.role) {
      throw new Error(
        data.role === 'store_owner'
          ? 'ROLE_MISMATCH:هذا الحساب مسجل كمتجر مسبقاً. يرجى الدخول من تبويب متجر.'
          : 'ROLE_MISMATCH:هذا الحساب مسجل كزبون مسبقاً. يرجى التحويل إلى تبويب زبون.'
      );
    }
    const city = data.governorate || opts.governorate || 'بغداد';
    const coords = getCityCoordinates(city);
    let storeProfile: StoreProfile | null = null;
    if (data.role === 'store_owner' && data.storeId) {
      try {
        const sSnap = await getDoc(doc(db, 'stores', data.storeId));
        if (sSnap.exists()) {
          storeProfile = mapDocToStore(sSnap.data() as Record<string, unknown>);
        }
      } catch {
        // Ignore if missing
      }
    }
    return {
      user: {
        id: data.id,
        name: data.name,
        email: fbUser.email || '',
        role: data.role,
        storeId: data.storeId,
        city,
        district: data.district,
        lat: coords.lat,
        lng: coords.lng,
        authProvider: 'firebase',
      },
      store: storeProfile,
      isNew: false,
    };
  }

  const gov = clampString(
    opts.governorate || opts.storeDraft?.city,
    'بغداد',
    2,
    64
  );
  const dist = clampString(
    opts.district || opts.storeDraft?.district,
    '',
    0,
    64
  );
  const fallbackCoords = getCityCoordinates(gov);
  const userLat =
    typeof opts.lat === 'number' && Number.isFinite(opts.lat)
      ? opts.lat
      : fallbackCoords.lat;
  const userLng =
    typeof opts.lng === 'number' && Number.isFinite(opts.lng)
      ? opts.lng
      : fallbackCoords.lng;
  const displayName = clampString(
    opts.displayNameOverride || fbUser.displayName || opts.storeDraft?.storeName,
    'مستخدم تكنو فون',
    2,
    120
  );

  let storeId: string | undefined;
  let createdStore: StoreProfile | null = null;

  if (opts.role === 'store_owner') {
    storeId = sanitizeId(`store-${uid.slice(0, 10)}`);
    const draft = opts.storeDraft;
    const storeName = clampString(
      draft?.storeName || `متجر ${displayName}`,
      `متجر ${displayName}`,
      2,
      160
    );
    const safeLogo =
      draft?.logo && draft.logo.trim().length <= 950
        ? draft.logo.trim()
        : DEFAULT_STORE_LOGO;
    const safeLicense =
      draft?.licenseDocUrl && draft.licenseDocUrl.trim().length <= 950
        ? draft.licenseDocUrl.trim()
        : undefined;
    const hasDoc = Boolean(safeLicense);
    const safeLat =
      typeof draft?.lat === 'number' && Number.isFinite(draft.lat)
        ? draft.lat
        : userLat;
    const safeLng =
      typeof draft?.lng === 'number' && Number.isFinite(draft.lng)
        ? draft.lng
        : userLng;
    const safeSpecialties =
      draft?.specialties && draft.specialties.length > 0
        ? draft.specialties.slice(0, 15).map((s) => s.slice(0, 80))
        : ['هواتف ذكية', 'صيانة معتمدة'];

    const storeDocData = {
      id: storeId,
      ownerId: uid,
      name: storeName,
      logo: safeLogo,
      city: clampString(draft?.city, gov, 2, 64),
      district: clampString(draft?.district || dist, 'المركز', 0, 64),
      address: clampString(draft?.address, `${gov} — المركز التجاري`, 2, 300),
      phone: clampString(draft?.phone, '07700000000', 6, 32),
      workingHours: clampString(
        draft?.workingHours,
        '10:00 صباحاً – 10:30 مساءً',
        2,
        120
      ),
      description: clampString(
        draft?.description,
        'متجر متخصص في بيع وصيانة الأجهزة الذكية في العراق.',
        2,
        1000
      ),
      specialties: safeSpecialties,
      lat: safeLat,
      lng: safeLng,
      verified: false,
      verificationStatus: hasDoc ? 'pending' : 'unverified',
      ...(safeLicense ? { licenseDocUrl: safeLicense } : {}),
      avgRating: 5,
      reviewCount: 0,
      technicians: [],
      promoCodes: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'stores', storeId), storeDocData);
      createdStore = {
        ...storeDocData,
        verificationStatus: hasDoc ? 'pending' : 'unverified',
        createdAt: new Date().toISOString().slice(0, 10),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `stores/${storeId}`);
    }
  }

  try {
    await setDoc(userRef, {
      id: uid,
      name: displayName,
      role: opts.role,
      ...(storeId ? { storeId } : {}),
      governorate: gov,
      district: dist,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
  }

  try {
    await setDoc(privateRef, {
      email: clampString(fbUser.email, `${uid}@example.com`, 3, 160),
      lat: userLat,
      lng: userLng,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${uid}/private/info`);
  }

  return {
    user: {
      id: uid,
      name: displayName,
      email: fbUser.email || '',
      role: opts.role,
      storeId,
      city: gov,
      district: dist,
      lat: userLat,
      lng: userLng,
      authProvider: 'firebase',
    },
    store: createdStore,
    isNew: true,
  };
}

// ── Direct Firestore Marketplace & Customer Operations ───────────────────────

export async function fetchMarketplaceFromFirestore(
  customerUid?: string
): Promise<{
  stores: StoreProfile[];
  products: Product[];
  reviews: VerifiedReview[];
  bookings: TrackingRecord[];
}> {
  if (!auth.currentUser) {
    return { stores: [], products: [], reviews: [], bookings: [] };
  }

  const storesQ = query(
    collection(db, 'stores'),
    where('verificationStatus', 'in', ['unverified', 'pending', 'verified'])
  );
  const productsQ = query(
    collection(db, 'products'),
    where('inStock', '==', true)
  );
  const reviewsQ = query(
    collection(db, 'reviews'),
    where('verifiedPurchase', '==', true)
  );

  let stores: StoreProfile[] = [];
  let products: Product[] = [];
  let reviews: VerifiedReview[] = [];
  let bookings: TrackingRecord[] = [];

  try {
    const [sSnap, pSnap, rSnap] = await Promise.all([
      getDocs(storesQ),
      getDocs(productsQ),
      getDocs(reviewsQ),
    ]);
    stores = sSnap.docs.map((d) =>
      mapDocToStore(d.data() as Record<string, unknown>)
    );
    products = pSnap.docs.map((d) =>
      mapDocToProduct(d.data() as Record<string, unknown>)
    );
    reviews = rSnap.docs.map((d) =>
      mapDocToReview(d.data() as Record<string, unknown>)
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'stores/products/reviews');
  }

  if (customerUid) {
    try {
      const bQ = query(
        collection(db, 'bookings'),
        where('customerId', '==', sanitizeId(customerUid))
      );
      const bSnap = await getDocs(bQ);
      bookings = bSnap.docs.map((d) =>
        mapDocToBooking(d.data() as Record<string, unknown>)
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'bookings');
    }
  }

  return { stores, products, reviews, bookings };
}

export async function fetchCustomerExtrasFromFirestore(uid: string): Promise<{
  wishlistItems: WishlistItem[];
  notifications: NotificationItem[];
  tradeIns: TradeInRequest[];
}> {
  if (!auth.currentUser) {
    return { wishlistItems: [], notifications: [], tradeIns: [] };
  }
  const cleanUid = sanitizeId(uid);
  try {
    const [wSnap, nSnap, tSnap] = await Promise.all([
      getDocs(query(collection(db, 'wishlists'), where('customerId', '==', cleanUid))),
      getDocs(query(collection(db, 'notifications'), where('userId', '==', cleanUid))),
      getDocs(query(collection(db, 'tradeins'), where('customerId', '==', cleanUid))),
    ]);

    return {
      wishlistItems: wSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: String(raw.id || d.id),
          customerId: String(raw.customerId || cleanUid),
          productId: String(raw.productId || ''),
          storeId: String(raw.storeId || ''),
          savedPrice: Number(raw.savedPrice || 0),
          notifyPriceDrop: Boolean(raw.notifyPriceDrop ?? true),
          createdAt: formatFsDateTime(raw.createdAt),
        };
      }),
      notifications: nSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: String(raw.id || d.id),
          userId: String(raw.userId || cleanUid),
          senderId: raw.senderId ? String(raw.senderId) : undefined,
          title: String(raw.title || ''),
          body: String(raw.body || ''),
          type: (raw.type as NotificationItem['type']) || 'stage_update',
          relatedId: raw.relatedId ? String(raw.relatedId) : undefined,
          read: Boolean(raw.read),
          createdAt: formatFsDateTime(raw.createdAt),
        };
      }),
      tradeIns: tSnap.docs.map((d) =>
        mapDocToTradeIn(d.data() as Record<string, unknown>)
      ),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'wishlists/notifications/tradeins');
  }
}

export async function toggleWishlistInFirestore(
  product: Product
): Promise<boolean> {
  if (!auth.currentUser) return false;
  const uid = sanitizeId(auth.currentUser.uid);
  const productId = sanitizeId(product.id);
  const wishId = sanitizeId(`${uid}__${productId}`);
  const ref = doc(db, 'wishlists', wishId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
      return false;
    }
    await setDoc(ref, {
      id: wishId,
      customerId: uid,
      productId,
      storeId: sanitizeId(product.storeId),
      savedPrice: Math.max(1, Number(product.price) || 1),
      notifyPriceDrop: true,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `wishlists/${wishId}`);
  }
}

export async function markNotificationReadInFirestore(
  notificationId: string
): Promise<void> {
  if (!auth.currentUser) return;
  const id = sanitizeId(notificationId);
  try {
    await updateDoc(doc(db, 'notifications', id), {
      read: true,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore transient errors
  }
}

export async function markAllNotificationsReadInFirestore(
  ids: string[]
): Promise<void> {
  if (!auth.currentUser || ids.length === 0) return;
  await Promise.all(ids.map((id) => markNotificationReadInFirestore(id)));
}

export async function syncBookingToFirestore(
  record: TrackingRecord
): Promise<TrackingRecord | null> {
  if (!auth.currentUser) return null;
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(record.id);
  const storeId = sanitizeId(record.storeId);
  const storeOwnerId = sanitizeId(record.storeOwnerId || uid);
  try {
    const storeSnap = await getDoc(doc(db, 'stores', storeId));
    if (!storeSnap.exists()) return null;
    const resolvedOwnerId = sanitizeId(
      String(storeSnap.data().ownerId || storeOwnerId)
    );
    const qrSafe = record.warrantyQrCodeData
      ? record.warrantyQrCodeData.slice(0, 600)
      : undefined;

    await setDoc(doc(db, 'bookings', bookingId), {
      id: bookingId,
      kind: record.kind,
      storeId,
      storeOwnerId: resolvedOwnerId,
      storeName: clampString(record.storeName, 'متجر تكنو فون', 2, 160),
      customerId: uid,
      customerName: clampString(record.customerName, 'زبون', 2, 120),
      phone: clampString(record.phone, '07700000000', 6, 32),
      ...(record.governorate
        ? { governorate: record.governorate.slice(0, 64) }
        : {}),
      ...(record.district ? { district: record.district.slice(0, 64) } : {}),
      title: clampString(record.title, 'طلب جديد', 2, 240),
      subtitle: clampString(record.subtitle, '', 0, 320),
      stage: 1,
      stageLabels: record.stageLabels,
      estimatedReady: clampString(record.estimatedReady, 'قيد المراجعة', 0, 160),
      totalPrice: Math.max(0, Number(record.totalPrice) || 0),
      ...(typeof record.deliveryFee === 'number'
        ? { deliveryFee: Math.max(0, record.deliveryFee) }
        : {}),
      ...(typeof record.discountAmount === 'number'
        ? { discountAmount: Math.max(0, record.discountAmount) }
        : {}),
      ...(record.promoCode
        ? { promoCode: record.promoCode.slice(0, 40) }
        : {}),
      notes: clampString(record.notes, '', 0, 1200),
      warrantyLabel: clampString(record.warrantyLabel, 'ضمان المتجر', 0, 160),
      ...(Array.isArray(record.faultMediaUrls)
        ? { faultMediaUrls: record.faultMediaUrls.slice(0, 5) }
        : {}),
      ...(qrSafe ? { warrantyQrCodeData: qrSafe } : {}),
      reviewed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      ...record,
      id: bookingId,
      storeId,
      storeOwnerId: resolvedOwnerId,
      customerId: uid,
      stage: 1,
      reviewed: false,
    };
  } catch (err) {
    console.warn('Firestore booking write skipped:', err);
    return null;
  }
}

export async function createReviewInFirestore(opts: {
  booking: TrackingRecord;
  customerName: string;
  rating: number;
  comment: string;
  productId?: string;
}): Promise<{ review: VerifiedReview; booking: TrackingRecord }> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لإرسال تقييم موثق.');
  }
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(opts.booking.id);
  const storeId = sanitizeId(opts.booking.storeId);

  try {
    await setDoc(doc(db, 'reviews', bookingId), {
      id: bookingId,
      storeId,
      bookingId,
      ...(opts.productId ? { productId: sanitizeId(opts.productId) } : {}),
      customerId: uid,
      customerName: clampString(opts.customerName, 'زبون', 2, 120),
      rating: Math.min(5, Math.max(1, Math.round(opts.rating))),
      comment: clampString(opts.comment, 'تجربة ممتازة', 3, 800),
      verifiedPurchase: true,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'bookings', bookingId), {
      reviewed: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reviews/${bookingId}`);
  }

  return {
    review: {
      id: bookingId,
      storeId,
      bookingId,
      productId: opts.productId,
      customerId: uid,
      customerName: opts.customerName,
      rating: opts.rating,
      comment: opts.comment,
      verifiedPurchase: true,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    },
    booking: { ...opts.booking, reviewed: true },
  };
}

export async function syncReviewToFirestore(
  review: VerifiedReview
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(review.bookingId);
  try {
    const bSnap = await getDoc(doc(db, 'bookings', bookingId));
    if (!bSnap.exists() || bSnap.data().stage !== 4) return;
    await setDoc(doc(db, 'reviews', bookingId), {
      id: bookingId,
      storeId: sanitizeId(review.storeId),
      bookingId,
      ...(review.productId ? { productId: sanitizeId(review.productId) } : {}),
      customerId: uid,
      customerName: review.customerName.slice(0, 120),
      rating: review.rating,
      comment: review.comment.slice(0, 800),
      verifiedPurchase: true,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'bookings', bookingId), {
      reviewed: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore review mirror skipped:', err);
  }
}

export async function createTradeInDirectInFirestore(
  store: StoreProfile,
  payload: Partial<TradeInRequest>
): Promise<TradeInRequest> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لإرسال طلب الاستبدال.');
  }
  const uid = sanitizeId(auth.currentUser.uid);
  const storeId = sanitizeId(store.id);
  const storeOwnerId = sanitizeId(store.ownerId);
  const tradeinId = sanitizeId(`TR-${Date.now().toString(36)}`);
  const photoSafe =
    payload.photoUrl && payload.photoUrl.trim().length <= 1000
      ? payload.photoUrl.trim()
      : undefined;

  try {
    await setDoc(doc(db, 'tradeins', tradeinId), {
      id: tradeinId,
      storeId,
      storeOwnerId,
      customerId: uid,
      customerName: clampString(payload.customerName, 'زبون', 2, 120),
      phone: clampString(payload.phone, '07700000000', 6, 32),
      model: clampString(payload.model, 'جهاز ذكي', 2, 140),
      storage: clampString(payload.storage, '128 جيجابايت', 1, 64),
      batteryHealth: Math.min(
        100,
        Math.max(1, Number(payload.batteryHealth ?? 85))
      ),
      conditionNotes: clampString(payload.conditionNotes, '', 0, 600),
      ...(payload.imei ? { imei: payload.imei.slice(0, 32) } : {}),
      ...(photoSafe ? { photoUrl: photoSafe } : {}),
      estimatedValue: Math.max(0, Number(payload.estimatedValue || 0)),
      ...(payload.targetProductId
        ? { targetProductId: sanitizeId(payload.targetProductId) }
        : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tradeins/${tradeinId}`);
  }

  return {
    id: tradeinId,
    storeId,
    storeOwnerId,
    storeName: store.name,
    customerId: uid,
    customerName: payload.customerName || 'زبون',
    phone: payload.phone || '',
    deviceType: payload.deviceType || 'smartphone',
    model: payload.model || '',
    storage: payload.storage || '128 جيجابايت',
    batteryHealth: Number(payload.batteryHealth ?? 85),
    conditionNotes: payload.conditionNotes || '',
    imei: payload.imei,
    photoUrl: photoSafe,
    estimatedValue: Number(payload.estimatedValue || 0),
    targetProductId: payload.targetProductId,
    targetProductName: payload.targetProductName,
    status: 'pending',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

export async function respondTradeInInFirestore(
  id: string,
  payload: {
    status: 'quoted' | 'accepted' | 'rejected';
    offeredValue?: number;
    storeNotes?: string;
  }
): Promise<void> {
  if (!auth.currentUser) return;
  const tradeinId = sanitizeId(id);
  try {
    const patch: Record<string, unknown> = {
      status: payload.status,
      updatedAt: serverTimestamp(),
    };
    if (typeof payload.offeredValue === 'number') {
      patch.offeredValue = Math.max(0, payload.offeredValue);
    }
    if (typeof payload.storeNotes === 'string') {
      patch.storeNotes = payload.storeNotes.slice(0, 600);
    }
    await updateDoc(doc(db, 'tradeins', tradeinId), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tradeins/${tradeinId}`);
  }
}

export async function syncTradeInToFirestore(
  tradein: TradeInRequest
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const tradeinId = sanitizeId(tradein.id);
  try {
    const storeSnap = await getDoc(doc(db, 'stores', sanitizeId(tradein.storeId)));
    if (!storeSnap.exists()) return;
    await setDoc(doc(db, 'tradeins', tradeinId), {
      id: tradeinId,
      storeId: sanitizeId(tradein.storeId),
      storeOwnerId: sanitizeId(storeSnap.data().ownerId || uid),
      customerId: uid,
      customerName: tradein.customerName.slice(0, 120),
      phone: tradein.phone.slice(0, 32),
      model: tradein.model.slice(0, 140),
      storage: tradein.storage.slice(0, 64),
      batteryHealth: tradein.batteryHealth,
      conditionNotes: tradein.conditionNotes.slice(0, 600),
      ...(tradein.imei ? { imei: tradein.imei.slice(0, 32) } : {}),
      ...(tradein.photoUrl ? { photoUrl: tradein.photoUrl.slice(0, 1000) } : {}),
      estimatedValue: tradein.estimatedValue,
      ...(tradein.targetProductId
        ? { targetProductId: sanitizeId(tradein.targetProductId) }
        : {}),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore trade-in mirror skipped:', err);
  }
}

// ── Conversations in Firestore ───────────────────────────────────────────────

export async function loadConversationFromFirestore(
  storeId: string,
  customerId: string
): Promise<ChatMessage[]> {
  if (!auth.currentUser) return [];
  const threadId = sanitizeId(`${storeId}__${customerId}`);
  const uid = sanitizeId(auth.currentUser.uid);
  try {
    const convSnap = await getDoc(doc(db, 'conversations', threadId));
    if (!convSnap.exists()) return [];
    const msgQ = query(
      collection(db, 'conversations', threadId, 'messages'),
      where('customerId', '==', sanitizeId(customerId))
    );
    const snap = await getDocs(msgQ).catch(async () => {
      // Fallback query if store owner queries by storeOwnerId
      return getDocs(
        query(
          collection(db, 'conversations', threadId, 'messages'),
          where('storeOwnerId', '==', uid)
        )
      );
    });
    return snap.docs
      .map((d) => {
        const raw = d.data() as Record<string, unknown>;
        return {
          id: String(raw.id || d.id),
          storeId: String(raw.storeId || storeId),
          customerSessionId: String(raw.customerId || customerId),
          customerName: String(convSnap.data().customerName || 'زبون'),
          senderRole:
            (raw.senderRole as ChatMessage['senderRole']) || 'customer',
          text: String(raw.text || ''),
          createdAt: formatFsDateTime(raw.createdAt),
          _sortMs:
            raw.createdAt instanceof Timestamp
              ? raw.createdAt.toMillis()
              : 0,
        };
      })
      .sort((a, b) => a._sortMs - b._sortMs)
      .map(({ _sortMs: _, ...rest }) => rest);
  } catch {
    return [];
  }
}

export async function sendMessageInFirestore(opts: {
  store: StoreProfile;
  customerId: string;
  customerName: string;
  senderRole: 'customer' | 'store_owner';
  text: string;
}): Promise<ChatMessage> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لإرسال الرسالة.');
  }
  const uid = sanitizeId(auth.currentUser.uid);
  const storeId = sanitizeId(opts.store.id);
  const storeOwnerId = sanitizeId(opts.store.ownerId);
  const customerId = sanitizeId(opts.customerId);
  const threadId = sanitizeId(`${storeId}__${customerId}`);
  const msgId = sanitizeId(`msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const safeName = clampString(opts.customerName, 'زبون', 1, 120);

  try {
    const convRef = doc(db, 'conversations', threadId);
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        id: threadId,
        storeId,
        storeOwnerId,
        customerId,
        customerName: safeName,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(convRef, {
        customerName: safeName,
        lastMessageAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'conversations', threadId, 'messages', msgId), {
      id: msgId,
      storeId,
      customerId,
      storeOwnerId,
      senderId: uid,
      senderRole: opts.senderRole,
      text: clampString(opts.text, '.', 1, 1200),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${threadId}/messages/${msgId}`);
  }

  return {
    id: msgId,
    storeId,
    customerSessionId: customerId,
    customerName: safeName,
    senderRole: opts.senderRole,
    text: opts.text.trim(),
    createdAt: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

// ── Store Owner Portal Firestore Operations ──────────────────────────────────

export async function fetchStoreDashboardFromFirestore(
  store: StoreProfile
): Promise<{
  store: StoreProfile;
  products: Product[];
  bookings: TrackingRecord[];
  threads: ConversationThread[];
  reviews: VerifiedReview[];
  tradeins: TradeInRequest[];
  analytics: StoreAnalytics;
}> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لعرض لوحة المتجر.');
  }
  const ownerUid = sanitizeId(auth.currentUser.uid);
  const storeId = sanitizeId(store.id);

  try {
    const [sSnap, pSnap, bSnap, cSnap, rSnap, tSnap] = await Promise.all([
      getDoc(doc(db, 'stores', storeId)),
      getDocs(query(collection(db, 'products'), where('ownerId', '==', ownerUid))),
      getDocs(query(collection(db, 'bookings'), where('storeOwnerId', '==', ownerUid))),
      getDocs(query(collection(db, 'conversations'), where('storeOwnerId', '==', ownerUid))),
      getDocs(
        query(
          collection(db, 'reviews'),
          where('storeId', '==', storeId),
          where('verifiedPurchase', '==', true)
        )
      ),
      getDocs(query(collection(db, 'tradeins'), where('storeOwnerId', '==', ownerUid))),
    ]);

    const resolvedStore = sSnap.exists()
      ? mapDocToStore(sSnap.data() as Record<string, unknown>)
      : store;
    const products = pSnap.docs.map((d) =>
      mapDocToProduct(d.data() as Record<string, unknown>)
    );
    const bookings = bSnap.docs.map((d) =>
      mapDocToBooking(d.data() as Record<string, unknown>)
    );
    const reviews = rSnap.docs.map((d) =>
      mapDocToReview(d.data() as Record<string, unknown>)
    );
    const tradeins = tSnap.docs.map((d) =>
      mapDocToTradeIn(d.data() as Record<string, unknown>)
    );

    const threads: ConversationThread[] = await Promise.all(
      cSnap.docs.map(async (convDoc) => {
        const cData = convDoc.data() as Record<string, unknown>;
        const customerSessionId = String(cData.customerId || '');
        const customerName = String(cData.customerName || 'زبون');
        const msgSnap = await getDocs(
          query(
            collection(db, 'conversations', convDoc.id, 'messages'),
            where('storeOwnerId', '==', ownerUid)
          )
        );
        const messages = msgSnap.docs
          .map((m) => {
            const raw = m.data() as Record<string, unknown>;
            return {
              id: String(raw.id || m.id),
              storeId,
              customerSessionId,
              customerName,
              senderRole:
                (raw.senderRole as ChatMessage['senderRole']) || 'customer',
              text: String(raw.text || ''),
              createdAt: formatFsDateTime(raw.createdAt),
              _sortMs:
                raw.createdAt instanceof Timestamp
                  ? raw.createdAt.toMillis()
                  : 0,
            };
          })
          .sort((a, b) => a._sortMs - b._sortMs)
          .map(({ _sortMs: _, ...rest }) => rest);

        return {
          customerSessionId,
          customerName,
          storeId,
          lastMessageAt: formatFsDateTime(cData.lastMessageAt),
          messages,
        };
      })
    );

    const completedBookings = bookings.filter((b) => b.stage === 4);
    const pendingRepairs = bookings.filter(
      (b) => b.kind === 'repair' && b.stage < 4
    ).length;
    const salesRevenue = bookings
      .filter((b) => b.kind === 'order' || b.kind === 'reservation')
      .reduce((s, b) => s + (b.totalPrice || 0), 0);
    const repairRevenue = bookings
      .filter((b) => b.kind === 'repair')
      .reduce((s, b) => s + (b.totalPrice || 0), 0);

    const counter = new Map<string, { count: number; revenue: number }>();
    for (const bk of bookings) {
      if (bk.kind !== 'repair') {
        const prev = counter.get(bk.title) || { count: 0, revenue: 0 };
        counter.set(bk.title, {
          count: prev.count + 1,
          revenue: prev.revenue + (bk.totalPrice || 0),
        });
      }
    }
    const topProducts = Array.from(counter.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const avgRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            ).toFixed(1)
          )
        : resolvedStore.avgRating ?? 5;

    return {
      store: resolvedStore,
      products,
      bookings,
      threads,
      reviews,
      tradeins,
      analytics: {
        totalOrders: bookings.length,
        completedOrders: completedBookings.length,
        pendingRepairs,
        salesRevenue,
        repairRevenue,
        totalRevenue: salesRevenue + repairRevenue,
        avgRating,
        reviewCount: reviews.length,
        topProducts,
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `stores/${storeId}/dashboard`);
  }
}

export async function updateStoreProfileInFirestore(
  store: StoreProfile,
  patch: Partial<{
    name: string;
    logo: string;
    city: string;
    district: string;
    address: string;
    phone: string;
    workingHours: string;
    description: string;
    specialties: string[];
    licenseDocUrl: string;
    lat: number;
    lng: number;
    technicians: StoreTechnician[];
    promoCodes: PromoCode[];
  }>
): Promise<StoreProfile> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لتحديث المتجر.');
  }
  const storeId = sanitizeId(store.id);
  const storeRef = doc(db, 'stores', storeId);

  const allowedProfileKeys: Record<string, unknown> = {};
  if (typeof patch.name === 'string') {
    allowedProfileKeys.name = clampString(patch.name, store.name, 2, 160);
  }
  if (typeof patch.logo === 'string' && patch.logo.length <= 1000) {
    allowedProfileKeys.logo = patch.logo;
  }
  if (typeof patch.city === 'string') {
    allowedProfileKeys.city = clampString(patch.city, store.city, 2, 64);
  }
  if (typeof patch.district === 'string') {
    allowedProfileKeys.district = patch.district.slice(0, 64);
  }
  if (typeof patch.address === 'string') {
    allowedProfileKeys.address = clampString(patch.address, store.address, 2, 300);
  }
  if (typeof patch.phone === 'string') {
    allowedProfileKeys.phone = clampString(patch.phone, store.phone, 6, 32);
  }
  if (typeof patch.workingHours === 'string') {
    allowedProfileKeys.workingHours = patch.workingHours.slice(0, 120);
  }
  if (typeof patch.description === 'string') {
    allowedProfileKeys.description = patch.description.slice(0, 1000);
  }
  if (Array.isArray(patch.specialties)) {
    allowedProfileKeys.specialties = patch.specialties
      .slice(0, 15)
      .map((s) => String(s).slice(0, 80));
  }
  if (typeof patch.lat === 'number' && Number.isFinite(patch.lat)) {
    allowedProfileKeys.lat = patch.lat;
  }
  if (typeof patch.lng === 'number' && Number.isFinite(patch.lng)) {
    allowedProfileKeys.lng = patch.lng;
  }
  if (Array.isArray(patch.technicians)) {
    allowedProfileKeys.technicians = patch.technicians.slice(0, 20);
  }
  if (Array.isArray(patch.promoCodes)) {
    allowedProfileKeys.promoCodes = patch.promoCodes.slice(0, 20);
  }

  try {
    if (Object.keys(allowedProfileKeys).length > 0) {
      await updateDoc(storeRef, {
        ...allowedProfileKeys,
        updatedAt: serverTimestamp(),
      });
    }
    if (
      typeof patch.licenseDocUrl === 'string' &&
      patch.licenseDocUrl.trim() &&
      patch.licenseDocUrl.trim().length <= 1000
    ) {
      await updateDoc(storeRef, {
        licenseDocUrl: patch.licenseDocUrl.trim(),
        verificationStatus: 'pending',
        verified: false,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `stores/${storeId}`);
  }

  return {
    ...store,
    ...patch,
    ...(patch.licenseDocUrl
      ? { verificationStatus: 'pending' as const, verified: false }
      : {}),
  };
}

export async function createProductInFirestore(
  store: StoreProfile,
  input: {
    name: string;
    brand: string;
    category: Product['category'];
    price: number;
    oldPrice?: number;
    condition: Product['condition'];
    warrantyMonths: number;
    image: string;
    extraImages?: string[];
    imei?: string;
    batteryHealth?: number;
    previouslyOpened?: boolean;
    summary: string;
  }
): Promise<Product> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لإضافة منتج.');
  }
  const ownerId = sanitizeId(auth.currentUser.uid);
  const storeId = sanitizeId(store.id);
  const prodId = sanitizeId(`prod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const price = Math.max(1, Number(input.price) || 1);
  const oldPrice =
    typeof input.oldPrice === 'number' && input.oldPrice >= price
      ? input.oldPrice
      : undefined;
  const safeImage =
    input.image && input.image.trim().length <= 1000
      ? input.image.trim()
      : CATEGORY_DEFAULT_IMAGE[input.category];
  const safeExtras = Array.isArray(input.extraImages)
    ? input.extraImages.filter((u) => u && u.length <= 1000).slice(0, 6)
    : undefined;
  const categoryLabel = CATEGORY_LABELS[input.category] || 'هواتف ذكية';

  const docPayload = {
    id: prodId,
    storeId,
    ownerId,
    storeName: clampString(store.name, 'متجر تكنو فون', 2, 160),
    name: clampString(input.name, 'جهاز ذكي', 2, 200),
    brand: clampString(input.brand, 'عام', 1, 80),
    category: input.category,
    categoryLabel,
    price,
    ...(oldPrice !== undefined ? { oldPrice } : {}),
    condition: input.condition,
    inStock: true,
    warrantyMonths: Math.min(60, Math.max(0, Number(input.warrantyMonths) || 12)),
    image: safeImage,
    ...(safeExtras && safeExtras.length > 0 ? { extraImages: safeExtras } : {}),
    ...(input.imei ? { imei: input.imei.slice(0, 32) } : {}),
    ...(typeof input.batteryHealth === 'number'
      ? {
          batteryHealth: Math.min(100, Math.max(1, input.batteryHealth)),
        }
      : {}),
    ...(typeof input.previouslyOpened === 'boolean'
      ? { previouslyOpened: input.previouslyOpened }
      : {}),
    summary: clampString(input.summary, '', 0, 1000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'products', prodId), docPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `products/${prodId}`);
  }

  return mapDocToProduct(docPayload);
}

export async function updateProductPriceInFirestore(
  prod: Product,
  nextPrice: number
): Promise<Product> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لتعديل السعر.');
  }
  const prodId = sanitizeId(prod.id);
  const price = Math.max(1, Number(nextPrice) || 1);
  const oldPrice =
    price < prod.price
      ? prod.oldPrice && prod.oldPrice > prod.price
        ? prod.oldPrice
        : prod.price
      : prod.oldPrice && prod.oldPrice >= price
        ? prod.oldPrice
        : undefined;

  const patch: Record<string, unknown> = {
    price,
    updatedAt: serverTimestamp(),
  };
  if (oldPrice !== undefined) {
    patch.oldPrice = oldPrice;
  }

  try {
    await updateDoc(doc(db, 'products', prodId), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `products/${prodId}`);
  }

  return { ...prod, price, oldPrice };
}

export async function deleteProductInFirestore(productId: string): Promise<void> {
  if (!auth.currentUser) return;
  const prodId = sanitizeId(productId);
  try {
    await deleteDoc(doc(db, 'products', prodId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${prodId}`);
  }
}

export async function updateBookingInFirestore(
  booking: TrackingRecord,
  storeName: string,
  payload: {
    stage?: TicketStage;
    assignedTechnician?: string;
    technicianReport?: string;
  }
): Promise<TrackingRecord> {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول لتحديث الحجز.');
  }
  const bookingId = sanitizeId(booking.id);
  const nextStage = payload.stage ?? booking.stage;
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (typeof payload.stage === 'number' && payload.stage >= booking.stage) {
    patch.stage = payload.stage;
  }
  if (typeof payload.assignedTechnician === 'string') {
    patch.assignedTechnician = payload.assignedTechnician.slice(0, 120);
  }
  if (typeof payload.technicianReport === 'string') {
    patch.technicianReport = payload.technicianReport.slice(0, 1000);
  }
  let qr = booking.warrantyQrCodeData;
  if (nextStage === 4 && !qr) {
    qr = buildWarrantyQrData({
      id: booking.id,
      storeName,
      customerName: booking.customerName,
      title: booking.title,
      warrantyLabel: booking.warrantyLabel,
      createdAt: booking.createdAt,
    }).slice(0, 600);
    patch.warrantyQrCodeData = qr;
  }

  try {
    await updateDoc(doc(db, 'bookings', bookingId), patch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
  }

  return {
    ...booking,
    stage: nextStage,
    assignedTechnician:
      payload.assignedTechnician ?? booking.assignedTechnician,
    technicianReport: payload.technicianReport ?? booking.technicianReport,
    warrantyQrCodeData: qr,
  };
}
