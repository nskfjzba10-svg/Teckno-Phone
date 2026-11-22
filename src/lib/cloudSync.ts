import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getCityCoordinates } from '../data/catalog';
import {
  AuthUser,
  StoreProfile,
  TrackingRecord,
  TradeInRequest,
  UserRole,
  VerifiedReview,
} from '../types';
import { apiRequest } from './api';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from './firebase';

const DEFAULT_STORE_LOGO =
  '/src/assets/images/product_titanium_phone_1794983260872.jpg';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-');
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

export async function signInWithGoogleRole(opts: {
  role: UserRole;
  governorate?: string;
  district?: string;
  storeDraft?: {
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
  };
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
    // If role already registered differently in Firestore, surface immediately
    if (err instanceof Error && err.message.startsWith('ROLE_MISMATCH:')) {
      await signOutFirebase();
      throw new Error(err.message.replace('ROLE_MISMATCH:', ''));
    }
    // Otherwise let Firestore error throw so rules issues aren't silently swallowed,
    // UNLESS it's a transient offline error where backend session can still proceed.
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
    await signOutFirebase();
    throw err;
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
    governorate?: string;
    district?: string;
    storeDraft?: {
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
    };
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
          ? 'ROLE_MISMATCH:حساب Google هذا مسجل كمتجر مسبقاً. يرجى الدخول من تبويب متجر.'
          : 'ROLE_MISMATCH:حساب Google هذا مسجل كزبون مسبقاً. يرجى التحويل إلى تبويب زبون.'
      );
    }
    const city = data.governorate || opts.governorate || 'بغداد';
    const coords = getCityCoordinates(city);
    let storeProfile: StoreProfile | null = null;
    if (data.role === 'store_owner' && data.storeId) {
      try {
        const sSnap = await getDoc(doc(db, 'stores', data.storeId));
        if (sSnap.exists()) {
          storeProfile = sSnap.data() as StoreProfile;
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
  const coords = getCityCoordinates(gov);
  const displayName = clampString(
    fbUser.displayName || opts.storeDraft?.storeName,
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
        : coords.lat;
    const safeLng =
      typeof draft?.lng === 'number' && Number.isFinite(draft.lng)
        ? draft.lng
        : coords.lng;
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
      lat: coords.lat,
      lng: coords.lng,
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
      lat: coords.lat,
      lng: coords.lng,
      authProvider: 'firebase',
    },
    store: createdStore,
    isNew: true,
  };
}

export async function syncBookingToFirestore(
  record: TrackingRecord
): Promise<void> {
  if (!auth.currentUser) return;
  const uid = sanitizeId(auth.currentUser.uid);
  const bookingId = sanitizeId(record.id);
  const storeOwnerId = sanitizeId(record.storeOwnerId || uid);
  try {
    const storeSnap = await getDoc(doc(db, 'stores', sanitizeId(record.storeId)));
    if (!storeSnap.exists()) return; // Seed store lives on local Express DB if not yet created in Firestore
    await setDoc(doc(db, 'bookings', bookingId), {
      id: bookingId,
      kind: record.kind,
      storeId: sanitizeId(record.storeId),
      storeOwnerId: sanitizeId(storeSnap.data().ownerId || storeOwnerId),
      storeName: record.storeName.slice(0, 160),
      customerId: uid,
      customerName: record.customerName.slice(0, 120),
      phone: record.phone.slice(0, 32),
      ...(record.governorate ? { governorate: record.governorate } : {}),
      ...(record.district ? { district: record.district } : {}),
      title: record.title.slice(0, 240),
      subtitle: record.subtitle.slice(0, 320),
      stage: 1,
      stageLabels: record.stageLabels,
      estimatedReady: record.estimatedReady.slice(0, 160),
      totalPrice: record.totalPrice,
      ...(typeof record.deliveryFee === 'number'
        ? { deliveryFee: record.deliveryFee }
        : {}),
      ...(typeof record.discountAmount === 'number'
        ? { discountAmount: record.discountAmount }
        : {}),
      ...(record.promoCode ? { promoCode: record.promoCode } : {}),
      notes: record.notes.slice(0, 1200),
      warrantyLabel: record.warrantyLabel.slice(0, 160),
      ...(Array.isArray(record.faultMediaUrls)
        ? { faultMediaUrls: record.faultMediaUrls.slice(0, 5) }
        : {}),
      ...(record.warrantyQrCodeData
        ? { warrantyQrCodeData: record.warrantyQrCodeData.slice(0, 600) }
        : {}),
      reviewed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore booking mirror skipped:', err);
  }
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
