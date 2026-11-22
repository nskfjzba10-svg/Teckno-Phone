import type {
  Product,
  ProductCategory,
  RepairDeviceModel,
  RepairDeviceType,
  RepairServiceOption,
  StoreProfile,
  TrackingRecord,
  VerifiedReview,
} from '../types';

export const HERO_IMAGE = '/src/assets/images/hero_techno_studio_1794983261633.jpg';
export const WORKSHOP_IMAGE = '/src/assets/images/repair_workshop_lab_1794983265317.jpg';

export interface GovernorateInfo {
  name: string;
  districts: string[];
  lat: number;
  lng: number;
}

export const IRAQ_GOVERNORATES: GovernorateInfo[] = [
  {
    name: 'بغداد',
    districts: [
      'المنصور',
      'الكرادة',
      'الكاظمية',
      'الأعظمية',
      'زيونة',
      'الجادرية',
      'اليرموك',
      'السيدية',
      'الدورة',
      'الشعب',
      'البنوك',
      'حي الجامعة',
      'الغزالية',
      'شارع فلسطين',
    ],
    lat: 33.3152,
    lng: 44.3661,
  },
  {
    name: 'أربيل',
    districts: ['المركز', 'عينكاوة', 'بختياري', 'كسنزان', 'سوران', 'شقلاوة', 'رواندز'],
    lat: 36.1901,
    lng: 44.0091,
  },
  {
    name: 'البصرة',
    districts: ['العشار', 'الجزائر', 'الطويسة', 'المعقل', 'الجبيلة', 'البريهية', 'الزبير', 'أبي الخصيب', 'الهارثة'],
    lat: 30.5085,
    lng: 47.7804,
  },
  {
    name: 'النجف',
    districts: ['المركز', 'الكوفة', 'حي الأمير', 'الحيدرية', 'المناذرة', 'حي الغدير'],
    lat: 32.0259,
    lng: 44.3463,
  },
  {
    name: 'كربلاء',
    districts: ['المركز', 'حي الحسين', 'الهندية', 'الحر', 'الحسينية', 'حي المعلمين'],
    lat: 32.616,
    lng: 44.0249,
  },
  {
    name: 'نينوى',
    districts: ['الموصل - الساحل الأيسر', 'الموصل - الساحل الأيمن', 'تلعفر', 'الحمدانية', 'سنجار', 'تلكيف'],
    lat: 36.34,
    lng: 43.13,
  },
  {
    name: 'السليمانية',
    districts: ['المركز', 'سرجنار', 'بختياري', 'رانية', 'دوكان', 'قره داغ', 'كلار'],
    lat: 35.5558,
    lng: 45.4351,
  },
  {
    name: 'دهوك',
    districts: ['المركز', 'زاخو', 'سميل', 'عقرة', 'العمادية'],
    lat: 36.8679,
    lng: 42.9885,
  },
  {
    name: 'كركوك',
    districts: ['المركز', 'طريق بغداد', 'رحيم آوا', 'الحويجة', 'دبس', 'داقوق'],
    lat: 35.4681,
    lng: 44.3922,
  },
  {
    name: 'بابل',
    districts: ['الحلة', 'المسيب', 'المحاويل', 'القاسم', 'الهاشمية', 'الإسكندرية'],
    lat: 32.4833,
    lng: 44.4333,
  },
  {
    name: 'ديالى',
    districts: ['بعقوبة', 'الخالص', 'المقدادية', 'خانقين', 'بلدروز', 'مندلي'],
    lat: 33.7464,
    lng: 45.1489,
  },
  {
    name: 'الأنبار',
    districts: ['الرمادي', 'الفلوجة', 'هيت', 'حديثة', 'عنة', 'القائم', 'الرطبة'],
    lat: 33.4243,
    lng: 43.2988,
  },
  {
    name: 'ميسان',
    districts: ['العمارة', 'الميمونة', 'علي الغربي', 'المجر الكبير', 'الكحلاء'],
    lat: 31.8415,
    lng: 47.1454,
  },
  {
    name: 'ذي قار',
    districts: ['الناصرية', 'الشطرة', 'الرفاعي', 'سوق الشيوخ', 'الجبايش', 'قلعة سكر'],
    lat: 31.0539,
    lng: 46.2589,
  },
  {
    name: 'القادسية',
    districts: ['الديوانية', 'الشامية', 'عفك', 'الحمزة', 'غماس'],
    lat: 31.9898,
    lng: 44.9248,
  },
  {
    name: 'واسط',
    districts: ['الكوت', 'الصويرة', 'النعمانية', 'الحي', 'بدرة', 'العزيزية'],
    lat: 32.5085,
    lng: 45.8206,
  },
  {
    name: 'صلاح الدين',
    districts: ['تكريت', 'سامراء', 'بلد', 'بيجي', 'الدجيل', 'طوزخورماتو', 'الشرقاط'],
    lat: 34.606,
    lng: 43.6783,
  },
  {
    name: 'المثنى',
    districts: ['السماوة', 'الرميثة', 'الخضر', 'الوركاء', 'السلمان'],
    lat: 31.3204,
    lng: 45.2798,
  },
];

export const IRAQ_CITY_COORDS: Record<string, { lat: number; lng: number }> =
  IRAQ_GOVERNORATES.reduce(
    (acc, gov) => {
      acc[gov.name] = { lat: gov.lat, lng: gov.lng };
      return acc;
    },
    {} as Record<string, { lat: number; lng: number }>
  );

export function getCityCoordinates(city?: string): { lat: number; lng: number } {
  if (!city) return { lat: 33.3152, lng: 44.3661 };
  const normalized = city.trim();
  if (IRAQ_CITY_COORDS[normalized]) {
    return IRAQ_CITY_COORDS[normalized];
  }
  const match = IRAQ_GOVERNORATES.find((g) =>
    normalized.includes(g.name) || g.name.includes(normalized)
  );
  if (match) {
    return { lat: match.lat, lng: match.lng };
  }
  return { lat: 33.3152, lng: 44.3661 };
}

export function getGovernorateDistricts(gov?: string): string[] {
  if (!gov) return ['المركز'];
  const match = IRAQ_GOVERNORATES.find((g) => g.name === gov.trim());
  return match && match.districts.length > 0 ? match.districts : ['المركز'];
}

export function calculateDistanceKm(
  loc1?: { lat: number; lng: number } | null,
  loc2?: { lat: number; lng: number } | null
): number {
  if (!loc1 || !loc2) return 0;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function estimateDeliveryBetweenGovernorates(
  fromGov?: string,
  toGov?: string
): { fee: number; etaLabel: string } {
  const normFrom = fromGov?.trim() || 'بغداد';
  const normTo = toGov?.trim() || 'بغداد';

  if (normFrom === normTo) {
    return {
      fee: 3000,
      etaLabel: 'نفس اليوم أو خلال 24 ساعة',
    };
  }

  const coords1 = getCityCoordinates(normFrom);
  const coords2 = getCityCoordinates(normTo);
  const dist = calculateDistanceKm(coords1, coords2);

  if (dist < 150) {
    return {
      fee: 4000,
      etaLabel: 'خلال 24 إلى 48 ساعة',
    };
  }

  return {
    fee: 5000,
    etaLabel: 'خلال 48 إلى 72 ساعة',
  };
}

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 د.ع';
  return `${Math.round(amount).toLocaleString('en-US')} د.ع`;
}

export const CATEGORY_TABS: { id: ProductCategory; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'smartphones', label: 'هواتف ذكية' },
  { id: 'laptops_tablets', label: 'لابتوب وتابلت' },
  { id: 'audio_watches', label: 'ساعات وسماعات' },
  { id: 'accessories', label: 'شواحن وإكسسوارات' },
];

export const STORE_LOGO_PRESETS: { id: string; label: string; url: string }[] = [
  {
    id: 'preset-titanium',
    label: 'شعار تيتانيوم الذهبي',
    url: '/src/assets/images/product_titanium_phone_1794983260872.jpg',
  },
  {
    id: 'preset-lab',
    label: 'مختبر الصيانة المتطور',
    url: '/src/assets/images/repair_workshop_lab_1794983265317.jpg',
  },
  {
    id: 'preset-pro-laptop',
    label: 'أجهزة ماك برو الاحترافية',
    url: '/src/assets/images/product_pro_laptop_1794983261756.jpg',
  },
  {
    id: 'preset-audio',
    label: 'ساعات وصوتيات ذكية',
    url: '/src/assets/images/product_smartwatch_audio_1794983264111.jpg',
  },
  {
    id: 'preset-obsidian',
    label: 'أوبسيديان بلاك الفاخر',
    url: '/src/assets/images/product_obsidian_phone_1794983261353.jpg',
  },
];

export const REPAIR_DEVICE_TYPES: {
  id: RepairDeviceType;
  label: string;
}[] = [
  { id: 'smartphone', label: 'هاتف ذكي' },
  { id: 'tablet', label: 'جهاز لوحي (تابلت)' },
  { id: 'laptop', label: 'لابتوب وكمبيوتر محمول' },
  { id: 'smartwatch', label: 'ساعة ذكية' },
];

export const REPAIR_MODELS: RepairDeviceModel[] = [
  // Smartphones
  {
    id: 'rep-iphone-16-pro',
    name: 'iPhone 16 Pro / Pro Max',
    brand: 'Apple',
    deviceType: 'smartphone',
    priceMultiplier: 1.25,
  },
  {
    id: 'rep-iphone-15-pro',
    name: 'iPhone 15 Pro / Pro Max',
    brand: 'Apple',
    deviceType: 'smartphone',
    priceMultiplier: 1.15,
  },
  {
    id: 'rep-iphone-14',
    name: 'iPhone 14 / 14 Plus / Pro',
    brand: 'Apple',
    deviceType: 'smartphone',
    priceMultiplier: 1.0,
  },
  {
    id: 'rep-samsung-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    deviceType: 'smartphone',
    priceMultiplier: 1.2,
  },
  {
    id: 'rep-samsung-s23',
    name: 'Samsung Galaxy S23 / Ultra',
    brand: 'Samsung',
    deviceType: 'smartphone',
    priceMultiplier: 1.05,
  },
  {
    id: 'rep-xiaomi-14-ultra',
    name: 'Xiaomi 14 Ultra / 13 Pro',
    brand: 'Xiaomi',
    deviceType: 'smartphone',
    priceMultiplier: 0.95,
  },
  // Tablets
  {
    id: 'rep-ipad-pro-m4',
    name: 'iPad Pro 11 / 13 (M4)',
    brand: 'Apple',
    deviceType: 'tablet',
    priceMultiplier: 1.3,
  },
  {
    id: 'rep-ipad-air-m2',
    name: 'iPad Air (M2 / M1)',
    brand: 'Apple',
    deviceType: 'tablet',
    priceMultiplier: 1.05,
  },
  {
    id: 'rep-galaxy-tab-s9',
    name: 'Samsung Galaxy Tab S9 Ultra',
    brand: 'Samsung',
    deviceType: 'tablet',
    priceMultiplier: 1.15,
  },
  // Laptops
  {
    id: 'rep-macbook-pro-m3',
    name: 'MacBook Pro 14 / 16 (M3 / M2)',
    brand: 'Apple',
    deviceType: 'laptop',
    priceMultiplier: 1.4,
  },
  {
    id: 'rep-macbook-air-m2',
    name: 'MacBook Air 13 / 15 (M2 / M3)',
    brand: 'Apple',
    deviceType: 'laptop',
    priceMultiplier: 1.1,
  },
  {
    id: 'rep-dell-xps-15',
    name: 'Dell XPS 15 / 13 Plus',
    brand: 'Dell',
    deviceType: 'laptop',
    priceMultiplier: 1.15,
  },
  // Smartwatches
  {
    id: 'rep-apple-watch-ultra',
    name: 'Apple Watch Ultra 2 / Ultra 1',
    brand: 'Apple',
    deviceType: 'smartwatch',
    priceMultiplier: 1.1,
  },
  {
    id: 'rep-apple-watch-series',
    name: 'Apple Watch Series 9 / 8 / 7',
    brand: 'Apple',
    deviceType: 'smartwatch',
    priceMultiplier: 0.9,
  },
  {
    id: 'rep-galaxy-watch-6',
    name: 'Samsung Galaxy Watch 6 Classic',
    brand: 'Samsung',
    deviceType: 'smartwatch',
    priceMultiplier: 0.85,
  },
];

export const REPAIR_SERVICES: RepairServiceOption[] = [
  {
    id: 'srv-screen-original',
    label: 'استبدال الشاشة الأصلية 100% مع True Tone',
    basePrice: 135000,
    durationLabel: '40 - 60 دقيقة',
    warrantyMonths: 12,
    description:
      'شاشة أصلية معتمدة مع نقل المعايرة اللونية التلقائية ومستشعر الإضاءة وختم مقاومة الماء.',
  },
  {
    id: 'srv-battery-bms',
    label: 'استبدال البطارية الأصلية مع نقل BMS وصحة 100%',
    basePrice: 65000,
    durationLabel: '30 - 45 دقيقة',
    warrantyMonths: 6,
    description:
      'خلايا بطارية جديدة أصلية بدون رسائل تحذيرية في النظام مع ضمان كفاءة دورات الشحن.',
  },
  {
    id: 'srv-charging-port',
    label: 'إصلاح منفذ الشحن ومشاكل IC الشحن (Tristar/Hydra)',
    basePrice: 45000,
    durationLabel: '45 دقيقة',
    warrantyMonths: 3,
    description:
      'تشخيص جهد الشحن بالميكرو أمبير وتغيير فلاتة الشحن الأصلية مع تنظيف المسارات الصوتية.',
  },
  {
    id: 'srv-back-glass',
    label: 'تغيير الزجاج الخلفي بجهاز الليزر الدقيق',
    basePrice: 40000,
    durationLabel: '60 دقيقة',
    warrantyMonths: 6,
    description:
      'إزالة الزجاج المكسور بتقنية الليزر دون الحاجة لفك المكونات الداخلية الحساسة.',
  },
  {
    id: 'srv-motherboard-repair',
    label: 'صيانة اللوحة الأم (Micro-soldering) وعلاج السوائل',
    basePrice: 110000,
    durationLabel: '2 - 4 ساعات',
    warrantyMonths: 3,
    description:
      'فحص مجهري إلكتروني وإصلاح خطوط التغذية القصيرة (Short Circuit) واستعادة ملفات البيانات.',
  },
  {
    id: 'srv-camera-lens',
    label: 'استبدال وحدة الكاميرا أو عدسة الحماية الخلفية',
    basePrice: 55000,
    durationLabel: '30 دقيقة',
    warrantyMonths: 6,
    description:
      'حل مشاكل التركيز التلقائي (Focus)، الاهتزاز، والضبابية بزجاج زفيري أصلي.',
  },
];

export const REPAIR_CAUSES: string[] = [
  'سقوط أو صدمة مباشرة على الأرض',
  'تعرض الجهاز للماء أو السوائل',
  'توقف مفاجئ بدون سبب ظاهري',
  'استخدام شاحن تجاري غير متوافق',
  'انتفاخ البطارية أو تراجع أدائها',
  'تحديث نظام غير مكتمل أو تعليق على الشعار',
];

export const REPAIR_SYMPTOMS: string[] = [
  'كسر الشاشة الخارجية أو ظهور خطوط عمودية وشاشة سوداء',
  'توقف اللمس عن الاستجابة تماماً أو لمس عشوائي',
  'سرعة نفاد شحن البطارية وانطفاء الجهاز قبل الصفر',
  'الجهاز لا يقبل الشحن أو يسخن بشدة أثناء التوصيل',
  'توقف الجهاز عن العمل تماماً (موت مفاجئ)',
  'انقطاع صوت السماعة أو تشويش في مكبر الصوت والمايكروفون',
  'اهتزاز في الكاميرا أو عدم وضوح الصور وضبابيتها',
  'فقدان إشارة الشبكة أو تعطل الـ Wi-Fi والبلوتوث',
];

export function buildWarrantyQrData(opts: {
  id: string;
  storeName: string;
  customerName: string;
  title: string;
  warrantyLabel?: string;
  createdAt: string;
}): string {
  const payload = {
    platform: 'تكنو فون — العراق (Techno Phone IQ)',
    warrantyCode: opts.id,
    store: opts.storeName,
    client: opts.customerName,
    device: opts.title,
    warranty: opts.warrantyLabel || 'ضمان معتمد 12 شهراً',
    issuedDate: opts.createdAt,
    officialVerificationUrl: `https://technophone.iq/verify/${encodeURIComponent(opts.id)}`,
  };
  return JSON.stringify(payload);
}

export const INITIAL_STORES: StoreProfile[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_TRACKING_RECORDS: TrackingRecord[] = [];

export const INITIAL_REVIEWS: VerifiedReview[] = [];

