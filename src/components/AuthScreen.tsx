import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Crosshair,
  FileCheck2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Store,
  Upload,
  User,
} from 'lucide-react';
import {
  IRAQ_GOVERNORATES,
  STORE_LOGO_PRESETS,
  getCityCoordinates,
  getGovernorateDistricts,
} from '../data/catalog';
import {
  setAuthToken,
  uploadMediaFile,
} from '../lib/api';
import {
  loginWithEmailRole,
  registerCustomerAccount,
  registerStoreAccount,
  signInWithGoogleRole,
} from '../lib/cloudSync';
import { AuthUser, StoreProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SafeImage } from './SafeImage';
import { ThemeMode, ThemeToggle } from './ThemeToggle';

interface AuthScreenProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthSuccess: (
    user: AuthUser,
    store: StoreProfile | null,
    isNewRegistration: boolean
  ) => void;
}

type RoleMode = 'customer' | 'store';
type AuthAction = 'login' | 'register';

function formatAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (!raw) return 'حدث خطأ غير متوقع أثناء التسجيل. يرجى المحاولة مرة أخرى.';

  // Unwrap Firestore JSON error payloads from handleFirestoreError
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string') {
      const lower = parsed.error.toLowerCase();
      if (lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
        return 'تعذر حفظ بيانات الحساب في السحابة بسبب عدم تطابق بعض الحقول المطلوبة. تأكد من إدخال الاسم ورقم الهاتف والعنوان بشكل صحيح.';
      }
      if (lower.includes('unavailable') || lower.includes('network')) {
        return 'تعذر الاتصال بقاعدة البيانات السحابية حالياً. تحقق من اتصال الإنترنت وأعد المحاولة.';
      }
      return 'حدث خطأ في المزامنة السحابية للبيانات. يرجى المحاولة مجدداً.';
    }
  } catch {
    // Not a JSON error string
  }

  const lower = raw.toLowerCase();
  if (lower.includes('auth/popup-closed-by-user')) {
    return 'تم إغلاق نافذة تسجيل الدخول عبر Google قبل إتمام العملية.';
  }
  if (lower.includes('auth/popup-blocked')) {
    return 'تم حظر النافذة المنبثقة من المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجدداً.';
  }
  if (lower.includes('auth/cancelled-popup-request')) {
    return 'تم إلغاء طلب نافذة تسجيل الدخول. يرجى المحاولة مرة واحدة.';
  }
  if (lower.includes('auth/unauthorized-domain')) {
    const host =
      typeof window !== 'undefined' ? window.location.hostname : '';
    return host
      ? `النطاق الحالي (${host}) غير مضاف في النطاقات المصرح بها لتسجيل Google (Authentication → Settings → Authorized domains). يمكنك استخدام البريد الإلكتروني وكلمة المرور أدناه مباشرة.`
      : 'النطاق الحالي غير مضاف في إعدادات النطاقات المصرح بها لتسجيل Google، يرجى استخدام التسجيل بالبريد الإلكتروني وكلمة المرور.';
  }
  if (lower.includes('auth/email-already-in-use')) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة أو استخدام بريد آخر.';
  }
  if (
    lower.includes('auth/invalid-credential') ||
    lower.includes('auth/wrong-password') ||
    lower.includes('auth/user-not-found')
  ) {
    return 'بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.';
  }
  if (lower.includes('auth/weak-password')) {
    return 'كلمة المرور ضعيفة جداً؛ يرجى إدخال كلمة مرور من 6 أحرف على الأقل.';
  }
  if (lower.includes('auth/invalid-email')) {
    return 'صيغة البريد الإلكتروني غير صالحة.';
  }
  if (lower.includes('auth/too-many-requests')) {
    return 'تم تجاوز عدد المحاولات المسموح بها مؤقتاً، يرجى الانتظار دقيقة ثم المحاولة.';
  }
  if (lower.includes('auth/network-request-failed')) {
    return 'تعذر الاتصال بخدمة المصادقة السحابية. تحقق من اتصال الإنترنت.';
  }
  if (lower.includes('auth/operation-not-allowed')) {
    return 'مزود تسجيل الدخول هذا غير مفعّل في إعدادات Firebase Authentication. افتح لوحة Firebase Console ثم Authentication → Sign-in method وفعّل Email/Password و Google.';
  }
  if (lower.includes('auth/account-exists-with-different-credential')) {
    return 'هذا البريد مسجل مسبقاً بطريقة دخول مختلفة.';
  }

  return raw;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  theme,
  onToggleTheme,
  onAuthSuccess,
}) => {
  const [roleMode, setRoleMode] = useState<RoleMode>('customer');
  const [action, setAction] = useState<AuthAction>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Customer registration fields
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [custCity, setCustCity] = useState('بغداد');
  const [custDistrict, setCustDistrict] = useState('المنصور');
  const [custLat, setCustLat] = useState<number | null>(null);
  const [custLng, setCustLng] = useState<number | null>(null);
  const [custLocating, setCustLocating] = useState(false);

  // Store registration fields (full store upload + verification doc)
  const [ownerName, setOwnerName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeLogo, setStoreLogo] = useState(STORE_LOGO_PRESETS[0].url);
  const [storeCity, setStoreCity] = useState('بغداد');
  const [storeDistrict, setStoreDistrict] = useState('المنصور');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeHours, setStoreHours] = useState('10:00 صباحاً – 11:00 مساءً');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeSpecialtiesText, setStoreSpecialtiesText] = useState(
    'بيع الأجهزة الجديدة والمستعملة، الإكسسوارات، صيانة الشاشات والبطاريات'
  );
  const [licenseDocUrl, setLicenseDocUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [storeLocating, setStoreLocating] = useState(false);

  const custDistrictOptions = useMemo(
    () => getGovernorateDistricts(custCity),
    [custCity]
  );
  const storeDistrictOptions = useMemo(
    () => getGovernorateDistricts(storeCity),
    [storeCity]
  );

  const switchRole = (nextRole: RoleMode) => {
    setRoleMode(nextRole);
    setError('');
  };

  const handleLogoFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError('');
    try {
      const uploaded = await uploadMediaFile(file);
      setStoreLogo(uploaded.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر تحميل ملف الشعار، يرجى اختيار صورة صالحة.'
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLicenseUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLicense(true);
    setError('');
    try {
      const uploaded = await uploadMediaFile(file);
      setLicenseDocUrl(uploaded.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'تعذر رفع وثيقة إجازة المحل أو الهوية.'
      );
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleDetectCustomerLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const fallback = getCityCoordinates(custCity);
      setCustLat(fallback.lat);
      setCustLng(fallback.lng);
      return;
    }
    setCustLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustLat(Number(pos.coords.latitude.toFixed(5)));
        setCustLng(Number(pos.coords.longitude.toFixed(5)));
        setCustLocating(false);
      },
      () => {
        setCustLocating(false);
        setError(
          'لم نتمكن من تحديد موقعك تلقائياً، سيتم استخدام مركز المحافظة المختارة تلقائياً.'
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const handleDetectStoreLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setStoreLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStoreLat(Number(pos.coords.latitude.toFixed(5)));
        setStoreLng(Number(pos.coords.longitude.toFixed(5)));
        setStoreLocating(false);
      },
      () => {
        setStoreLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const specialties = storeSpecialtiesText
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const fallbackStoreCoords = getCityCoordinates(storeCity);
      const result = await signInWithGoogleRole({
        role: roleMode === 'store' ? 'store_owner' : 'customer',
        governorate: roleMode === 'store' ? storeCity : custCity,
        district: roleMode === 'store' ? storeDistrict : custDistrict,
        storeDraft:
          roleMode === 'store'
            ? {
                storeName: storeName.trim(),
                logo: storeLogo,
                city: storeCity,
                district: storeDistrict,
                address: storeAddress.trim(),
                phone: storePhone.trim(),
                workingHours: storeHours,
                description: storeDescription.trim(),
                specialties,
                licenseDocUrl: licenseDocUrl || undefined,
                lat: storeLat ?? fallbackStoreCoords.lat,
                lng: storeLng ?? fallbackStoreCoords.lng,
              }
            : undefined,
      });

      if (roleMode === 'store' && result.user.role !== 'store_owner') {
        setError('حساب Google هذا مسجل كزبون مسبقاً. يرجى التحويل إلى تبويب زبون.');
        setGoogleLoading(false);
        return;
      }
      if (roleMode === 'customer' && result.user.role !== 'customer') {
        setError('حساب Google هذا مسجل كمتجر مسبقاً. يرجى الدخول من تبويب متجر.');
        setGoogleLoading(false);
        return;
      }

      setAuthToken(result.token);
      onAuthSuccess(result.user, result.store, result.isNew);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const expectedRole = roleMode === 'store' ? 'store_owner' : 'customer';
      const res = await loginWithEmailRole({
        email: loginEmail,
        password: loginPassword,
        expectedRole,
      });

      if (roleMode === 'store' && res.user.role !== 'store_owner') {
        setError('هذا الحساب مسجل كزبون وليس كمتجر. يرجى التحويل إلى تبويب زبون.');
        setLoading(false);
        return;
      }
      if (roleMode === 'customer' && res.user.role !== 'customer') {
        setError('هذا الحساب مسجل كمتجر. يرجى الدخول من تبويب متجر لإدارة متجرك.');
        setLoading(false);
        return;
      }

      setAuthToken(res.token);
      onAuthSuccess(res.user, res.store || null, false);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (custName.trim().length < 2) {
      setError('يرجى إدخال الاسم الكامل (حرفين على الأقل).');
      return;
    }
    if (!custEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (custPassword.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      const fallbackCoords = getCityCoordinates(custCity);
      const res = await registerCustomerAccount({
        name: custName.trim(),
        email: custEmail.trim(),
        password: custPassword,
        city: custCity,
        district: custDistrict,
        lat: custLat ?? fallbackCoords.lat,
        lng: custLng ?? fallbackCoords.lng,
      });
      setAuthToken(res.token);
      onAuthSuccess(res.user, null, true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (storeName.trim().length < 2) {
      setError('يرجى إدخال اسم المتجر (حرفين على الأقل).');
      return;
    }
    if (ownerName.trim().length < 2) {
      setError('يرجى إدخال اسم صاحب أو مدير المتجر.');
      return;
    }
    if (storePhone.replace(/\D/g, '').length < 6) {
      setError('يرجى إدخال رقم هاتف متجر صحيح (6 أرقام على الأقل).');
      return;
    }
    if (storeAddress.trim().length < 2) {
      setError('يرجى إدخال العنوان التفصيلي للمتجر.');
      return;
    }
    if (!storeEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح للدخول.');
      return;
    }
    if (storePassword.length < 6) {
      setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
      const specialties = storeSpecialtiesText
        .split(/[،,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const fallbackCoords = getCityCoordinates(storeCity);
      const res = await registerStoreAccount({
        ownerName: ownerName.trim(),
        email: storeEmail.trim(),
        password: storePassword,
        storeName: storeName.trim(),
        logo: storeLogo,
        city: storeCity,
        district: storeDistrict,
        address: storeAddress.trim(),
        phone: storePhone.trim(),
        workingHours: storeHours.trim(),
        description: storeDescription.trim(),
        specialties,
        licenseDocUrl: licenseDocUrl || undefined,
        lat: storeLat ?? fallbackCoords.lat,
        lng: storeLng ?? fallbackCoords.lng,
      });
      setAuthToken(res.token);
      onAuthSuccess(res.user, res.store, true);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col py-4 sm:py-8 px-3 sm:px-6 lg:px-8 transition-colors pb-safe pt-safe">
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between gap-2 mb-4">
        <PWAInstallButton variant="card" className="min-h-[40px] py-1.5 px-3" />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} showLabel />
      </div>

      <div className="max-w-3xl w-full mx-auto my-auto space-y-5 sm:space-y-6">
        {/* Platform Title Header */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="شعار تكنو فون"
              className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-200 dark:border-slate-700"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-200">
            <MapPin className="w-3.5 h-3.5" />
            <span>منصة العراق لبيع وصيانة الأجهزة الذكية</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
            تكنو فون — Techno Phone
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            اختر نوع الحساب للمتابعة: الدخول كزبون لتصفح المنتجات والمتاجر القريبة، أو كمتجر لإدارة متجرك ومنتجاتك.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Step 1: Role Switcher (Customer vs Store) */}
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
            <button
              type="button"
              onClick={() => switchRole('customer')}
              className={`p-4 sm:p-5 flex items-center justify-center gap-3 text-right transition-colors cursor-pointer border-b-2 ${
                roleMode === 'customer'
                  ? 'bg-white dark:bg-slate-900 border-blue-700 dark:border-blue-500 text-slate-900 dark:text-slate-100'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  roleMode === 'customer'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold">دخول كزبون</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  تصفح المنتجات، الصيانة والمتاجر القريبة
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => switchRole('store')}
              className={`p-4 sm:p-5 flex items-center justify-center gap-3 text-right transition-colors cursor-pointer border-b-2 ${
                roleMode === 'store'
                  ? 'bg-white dark:bg-slate-900 border-blue-700 dark:border-blue-500 text-slate-900 dark:text-slate-100'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  roleMode === 'store'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold">دخول كمتجر</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  رفع بيانات المتجر وإدارة المنتجات والطلبات
                </div>
              </div>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Step 2: Login vs Register Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setAction('login');
                  setError('');
                }}
                className={`py-2.5 px-4 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  action === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {roleMode === 'customer' ? 'تسجيل دخول زبون' : 'تسجيل دخول متجر'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAction('register');
                  setError('');
                }}
                className={`py-2.5 px-4 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  action === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {roleMode === 'customer' ? 'إنشاء حساب زبون' : 'تسجيل متجر جديد'}
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {/* LOGIN FORM (Scoped by Customer or Store) */}
            {action === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 max-w-lg mx-auto">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      roleMode === 'customer'
                        ? 'name@example.com'
                        : 'store@example.com'
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer min-h-[46px]"
                >
                  {loading
                    ? 'جاري التحقق...'
                    : roleMode === 'customer'
                      ? 'دخول كزبون واستعراض المنتجات'
                      : 'دخول إلى لوحة إدارة المتجر'}
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                >
                  <Cloud className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>
                    {googleLoading
                      ? 'جاري الاتصال السحابي...'
                      : roleMode === 'customer'
                        ? 'المتابعة عبر Google'
                        : 'دخول المتجر عبر Google'}
                  </span>
                </button>
              </form>
            )}

            {/* CUSTOMER REGISTRATION */}
            {action === 'register' && roleMode === 'customer' && (
              <form
                onSubmit={handleRegisterCustomer}
                className="space-y-4 max-w-lg mx-auto"
              >
                <div className="p-3.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  بعد إنشاء حسابك كزبون ستظهر لك جميع المتاجر المسجلة في التطبيق مرتبةً حسب الأقرب لموقعك، ويمكنك تصفح المنتجات وطلب الصيانة مباشرة.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="مثال: علي حسين الربيعي"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      المحافظة *
                    </label>
                    <select
                      value={custCity}
                      onChange={(e) => {
                        const nextGov = e.target.value;
                        setCustCity(nextGov);
                        setCustDistrict(getGovernorateDistricts(nextGov)[0] || '');
                        setCustLat(null);
                        setCustLng(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer"
                    >
                      {IRAQ_GOVERNORATES.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      القضاء / المنطقة
                    </label>
                    <select
                      value={custDistrict}
                      onChange={(e) => setCustDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer"
                    >
                      {custDistrictOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectCustomerLocation}
                  disabled={custLocating}
                  className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer min-h-[42px] ${
                    custLat !== null
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Crosshair className="w-4 h-4 shrink-0" />
                  <span>
                    {custLocating
                      ? 'جاري تحديد الموقع...'
                      : custLat !== null
                        ? 'تم حفظ موقعك التقريبي لترتيب المتاجر الأقرب'
                        : 'تحديد موقعي الحالي لترتيب المتاجر القريبة (اختياري)'}
                  </span>
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    required
                    minLength={6}
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer min-h-[46px]"
                >
                  <User className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'جاري إنشاء الحساب...'
                      : 'إنشاء حساب زبون وعرض المتاجر القريبة'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                >
                  <Cloud className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>
                    {googleLoading
                      ? 'جاري التسجيل عبر Google...'
                      : 'التسجيل السريع عبر Google كزبون'}
                  </span>
                </button>
              </form>
            )}

            {/* STORE REGISTRATION (Full store logo, name, district, license doc & details) */}
            {action === 'register' && roleMode === 'store' && (
              <form onSubmit={handleRegisterStore} className="space-y-5">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    عند التسجيل كمتجر، يتم رفع شعار المتجر ووثيقة التوثيق وعنوانه للزبائن، وتُفتح لك لوحة تحكم حصرية لإدارة متجرك وفريق الصيانة والمنتجات.
                  </span>
                </div>

                {/* Store Logo Upload & Presets */}
                <div className="space-y-3 p-4 rounded-xl bg-[#F8F9FA] dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    شعار المتجر *
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                      <SafeImage
                        src={storeLogo}
                        alt="معاينة شعار المتجر"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2.5 flex-1">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingLogo
                            ? 'جاري رفع الشعار...'
                            : 'رفع صورة شعار المتجر من جهازك'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="sr-only"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          أو اختر شعاراً جاهزاً:
                        </span>
                        {STORE_LOGO_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setStoreLogo(preset.url)}
                            className={`w-9 h-9 rounded-lg overflow-hidden border-2 cursor-pointer ${
                              storeLogo === preset.url
                                ? 'border-blue-700 dark:border-blue-400'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                            title={preset.label}
                          >
                            <SafeImage
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      اسم المتجر *
                    </label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="مثال: متجر النخيل للهواتف"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      اسم صاحب / مدير المتجر *
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="الاسم الكامل"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      المحافظة *
                    </label>
                    <select
                      value={storeCity}
                      onChange={(e) => {
                        const nextGov = e.target.value;
                        setStoreCity(nextGov);
                        setStoreDistrict(getGovernorateDistricts(nextGov)[0] || '');
                      }}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer"
                    >
                      {IRAQ_GOVERNORATES.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      القضاء / المنطقة *
                    </label>
                    <select
                      value={storeDistrict}
                      onChange={(e) => setStoreDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 cursor-pointer"
                    >
                      {storeDistrictOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      رقم هاتف المتجر *
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      required
                      value={storePhone}
                      onChange={(e) => setStorePhone(e.target.value)}
                      placeholder="077XXXXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right font-mono tabular-nums focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      الموقع والعنوان التفصيلي *
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectStoreLocation}
                      disabled={storeLocating}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                    >
                      {storeLat !== null && storeLng !== null ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-300">
                            تم حفظ الموقع الجغرافي للمتجر
                          </span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-3.5 h-3.5" />
                          <span>
                            {storeLocating
                              ? 'جاري تحديد الموقع...'
                              : 'تحديد الموقع الجغرافي للمتجر تلقائياً'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="الحي، الشارع، اسم المجمع التجاري أو رقم المحل"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                </div>

                {/* Store Verification License Upload */}
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>توثيق المتجر (إجازة المحل أو الهوية - اختياري عند التسجيل)</span>
                    </span>
                    {licenseDocUrl && (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        تم الرفع للمراجعة
                      </span>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingLicense
                        ? 'جاري رفع الوثيقة...'
                        : licenseDocUrl
                          ? 'تغيير صورة إجازة المحل / الهوية'
                          : 'رفع صورة إجازة المحل أو الهوية للحصول على شارة المتجر الموثّق'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLicenseUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      ساعات العمل
                    </label>
                    <input
                      type="text"
                      value={storeHours}
                      onChange={(e) => setStoreHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      التخصصات والخدمات (افصل بفاصلة)
                    </label>
                    <input
                      type="text"
                      value={storeSpecialtiesText}
                      onChange={(e) => setStoreSpecialtiesText(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    نبذة وتفاصيل المتجر *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="أدخل تفاصيل الأجهزة المتوفرة (جديدة / مستعملة / إكسسوارات)، الضمان، وخدمات الصيانة..."
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      البريد الإلكتروني للدخول *
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={storeEmail}
                      onChange={(e) => setStoreEmail(e.target.value)}
                      placeholder="store@example.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      كلمة المرور *
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      required
                      minLength={6}
                      value={storePassword}
                      onChange={(e) => setStorePassword(e.target.value)}
                      placeholder="6 أحرف على الأقل"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg text-right focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || uploadingLogo || uploadingLicense}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg cursor-pointer min-h-[46px]"
                >
                  <Store className="w-4 h-4" />
                  <span>
                    {loading
                      ? 'جاري رفع بيانات المتجر...'
                      : 'رفع بيانات المتجر والدخول للوحة الإدارة'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || uploadingLogo || uploadingLicense}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer min-h-[44px]"
                >
                  <Cloud className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>
                    {googleLoading
                      ? 'جاري تسجيل المتجر عبر Google...'
                      : 'تسجيل المتجر السريع عبر Google'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
