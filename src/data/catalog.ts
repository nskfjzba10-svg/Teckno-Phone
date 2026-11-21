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

export const INITIAL_STORES: StoreProfile[] = [
  {
    id: 'store-techno-baghdad',
    ownerId: 'owner-techno-baghdad',
    name: 'تكنو فون — فرع المنصور الرئيسي',
    logo: '/src/assets/images/product_titanium_phone_1794983260872.jpg',
    city: 'بغداد',
    district: 'المنصور',
    address: 'شارع 14 رمضان — قرب مول المنصور',
    phone: '07801234567',
    workingHours: '10:00 صباحاً – 11:30 مساءً',
    description:
      'الفرع الرئيسي لمنصة تكنو فون في بغداد؛ بيع الأجهزة الذكية الأصلية بأفضل الأسعار مع مختبر صيانة مجهري متقدم معتمد.',
    specialties: ['هواتف ذكية', 'صيانة معتمدة', 'استبدال Trade-In', 'إكسسوارات فاخرة'],
    lat: 33.3152,
    lng: 44.3661,
    verified: true,
    verificationStatus: 'verified',
    avgRating: 4.9,
    reviewCount: 38,
    technicians: [
      { id: 'tech-1', name: 'م. حيدر الكاظمي', specialty: 'هندسة المايكروسولدر واللوحات الأم' },
      { id: 'tech-2', name: 'علي السلامي', specialty: 'استبدال الشاشات والبطاريات ونقل True Tone' },
    ],
    promoCodes: [
      { code: 'TECHNO10', discountPercent: 10, active: true },
      { code: 'BAGHDAD5', discountPercent: 5, active: true },
    ],
    createdAt: '2026-01-10',
  },
  {
    id: 'store-spectrum-basra',
    ownerId: 'owner-spectrum-basra',
    name: 'سبيكتروم فون — فرع البصرة',
    logo: '/src/assets/images/product_obsidian_phone_1794983261353.jpg',
    city: 'البصرة',
    district: 'الجزائر',
    address: 'شارع الجزائر — مجمع البصرة للأجهزة الذكية',
    phone: '07709876543',
    workingHours: '09:30 صباحاً – 11:00 مساءً',
    description:
      'وجهتك الأولى في المنطقة الجنوبية لأحدث أجهزة آبل وسامسونج وخدمات الفحص الفوري والاستبدال بأعلى تقييم.',
    specialties: ['هواتف ذكية', 'لابتوب وتابلت', 'صيانة فورية', 'ضمان رسمي'],
    lat: 30.5085,
    lng: 47.7804,
    verified: true,
    verificationStatus: 'verified',
    avgRating: 4.8,
    reviewCount: 29,
    technicians: [
      { id: 'tech-3', name: 'أحمد التميمي', specialty: 'فحص الأجهزة وتغيير القطع الاستهلاكية' },
    ],
    promoCodes: [
      { code: 'BASRA5', discountPercent: 5, active: true },
    ],
    createdAt: '2026-02-01',
  },
  {
    id: 'store-erbil-tech',
    ownerId: 'owner-erbil-tech',
    name: 'أربيل تيك بلاتينيوم — عينكاوة',
    logo: '/src/assets/images/product_pro_laptop_1794983261756.jpg',
    city: 'أربيل',
    district: 'عينكاوة',
    address: 'عينكاوة — الشارع التجاري الرئيسي',
    phone: '07504321098',
    workingHours: '10:00 صباحاً – 10:00 مساءً',
    description:
      'مركز أجهزة العمل الاحترافية (MacBook Pro & ThinkPad) وهواتف الفلاجشيب العالمية مع دعم الشحن السريع لكافة المحافظات.',
    specialties: ['لابتوب وتابلت', 'هواتف ذكية', 'شواحن GaN', 'شاشات عرض'],
    lat: 36.1901,
    lng: 44.0091,
    verified: true,
    verificationStatus: 'verified',
    avgRating: 4.9,
    reviewCount: 22,
    technicians: [
      { id: 'tech-4', name: 'ريبين سوران', specialty: 'صيانة وتطوير حواسيب ماك ولابتوبات الألعاب' },
    ],
    promoCodes: [
      { code: 'ERBILFREE', discountPercent: 7, active: true },
    ],
    createdAt: '2026-03-05',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'tp-iphone-16-pro',
    storeId: 'store-techno-baghdad',
    ownerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    name: 'آيفون 16 برو تيتانيوم (iPhone 16 Pro)',
    brand: 'Apple',
    category: 'smartphones',
    categoryLabel: 'هواتف ذكية',
    price: 1650000,
    oldPrice: 1790000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 24,
    image: '/src/assets/images/product_titanium_phone_1794983260872.jpg',
    extraImages: [
      '/src/assets/images/product_obsidian_phone_1794983261353.jpg',
      '/src/assets/images/hero_techno_studio_1794983261633.jpg',
    ],
    imei: '358920194827104',
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'شريحة A18 Pro الجبارة، زر التحكم بالكاميرا الجديد كلياً، هيكل تيتانيوم خفيف وفائق الصلابة، مع دعم كامل للذكاء الاصطناعي.',
    specs: [
      { label: 'المعالج', value: 'Apple A18 Pro بتصنيع 3 نانومتر' },
      { label: 'الشاشة', value: '6.3 بوصة Super Retina XDR OLED بتردد 120Hz' },
      { label: 'الكاميرا الرئيسية', value: '48MP Fusion + 48MP Ultra Wide + 12MP 5x Tele' },
      { label: 'مادة الصنع', value: 'تيتانيوم طبي الدرجة 5' },
    ],
    storageOptions: [
      { label: '128 جيجابايت', priceDelta: 0 },
      { label: '256 جيجابايت', priceDelta: 120000 },
      { label: '512 جيجابايت', priceDelta: 280000 },
    ],
    colors: [
      { name: 'تيتانيوم صحراوي', hex: '#c9b197' },
      { name: 'تيتانيوم طبيعي', hex: '#9d9990' },
      { name: 'تيتانيوم أسود', hex: '#2c2b29' },
    ],
  },
  {
    id: 'tp-samsung-s24-ultra',
    storeId: 'store-spectrum-basra',
    ownerId: 'owner-spectrum-basra',
    storeName: 'سبيكتروم فون — فرع البصرة',
    name: 'سامسونج جالاكسي S24 ألترا (Galaxy S24 Ultra)',
    brand: 'Samsung',
    category: 'smartphones',
    categoryLabel: 'هواتف ذكية',
    price: 1540000,
    oldPrice: 1680000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 12,
    image: '/src/assets/images/product_obsidian_phone_1794983261353.jpg',
    extraImages: [
      '/src/assets/images/product_titanium_phone_1794983260872.jpg',
    ],
    imei: '354890123789456',
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'كاميرا 200 ميجابكسل، قلم S-Pen مدمج، معالج سنابدراجون 8 الجيل الثالث، وشاشة مسطحة مقاومة للانعكاس مع ميزات Galaxy AI.',
    specs: [
      { label: 'المعالج', value: 'Snapdragon 8 Gen 3 for Galaxy' },
      { label: 'الشاشة', value: '6.8 بوصة Dynamic AMOLED 2X مسطحة بدقة QHD+' },
      { label: 'البطارية', value: '5000 مللي أمبير مع شحن سريع 45W' },
      { label: 'الذكاء الاصطناعي', value: 'ميزات Galaxy AI والترجمة الفورية' },
    ],
    storageOptions: [
      { label: '256 جيجابايت', priceDelta: 0 },
      { label: '512 جيجابايت', priceDelta: 160000 },
    ],
    colors: [
      { name: 'تيتانيوم رمادي', hex: '#77787b' },
      { name: 'تيتانيوم أسود', hex: '#262626' },
      { name: 'تيتانيوم بنفسجي', hex: '#483c54' },
    ],
  },
  {
    id: 'tp-macbook-pro-m3',
    storeId: 'store-erbil-tech',
    ownerId: 'owner-erbil-tech',
    storeName: 'أربيل تيك بلاتينيوم — عينكاوة',
    name: 'ماك بوك برو 14 بوصة M3 Pro (MacBook Pro)',
    brand: 'Apple',
    category: 'laptops_tablets',
    categoryLabel: 'لابتوب وتابلت',
    price: 2750000,
    oldPrice: 2950000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 12,
    image: '/src/assets/images/product_pro_laptop_1794983261756.jpg',
    extraImages: [],
    imei: 'C02G80P1MD6R',
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'أداء استثنائي للمصممين والمطورين، شاشة Liquid Retina XDR بسطوع مبهر وعمر بطارية يصل إلى 22 ساعة عمل متواصلة.',
    specs: [
      { label: 'المعالج', value: 'Apple M3 Pro (11-Core CPU, 14-Core GPU)' },
      { label: 'الذاكرة العشوائية', value: '18 جيجابايت ذاكرة موحدة' },
      { label: 'التخزين', value: '512 جيجابايت SSD فائق السرعة' },
      { label: 'الشاشة', value: '14.2 بوصة Liquid Retina XDR ProMotion 120Hz' },
    ],
    storageOptions: [
      { label: '512 جيجابايت SSD', priceDelta: 0 },
      { label: '1 تيرابايت SSD', priceDelta: 320000 },
    ],
    colors: [
      { name: 'سبيس بلاك (Space Black)', hex: '#1c1d1f' },
      { name: 'فضي كلاسيكي', hex: '#e3e4e5' },
    ],
  },
  {
    id: 'tp-ipad-pro-m4',
    storeId: 'store-techno-baghdad',
    ownerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    name: 'آيباد برو 11 بوصة M4 فائق النحافة (iPad Pro M4)',
    brand: 'Apple',
    category: 'laptops_tablets',
    categoryLabel: 'لابتوب وتابلت',
    price: 1420000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 12,
    image: '/src/assets/images/product_pro_tablet_1794983262786.jpg',
    extraImages: [],
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'أنحف جهاز صنعته آبل مع شاشة Ultra Retina XDR بتقنية OLED المزدوجة ومعالج M4 القوي للرسم والمونتاج.',
    specs: [
      { label: 'المعالج', value: 'Apple M4 مع محرك عصبي 16 نواة' },
      { label: 'الشاشة', value: 'Tandem OLED بتردد 120Hz وسطوع 1600 شمعة' },
      { label: 'السُمك', value: '5.3 ملم فقط' },
    ],
    storageOptions: [
      { label: '256 جيجابايت', priceDelta: 0 },
      { label: '512 جيجابايت', priceDelta: 190000 },
    ],
    colors: [
      { name: 'سبيس بلاك', hex: '#262626' },
      { name: 'فضي', hex: '#e3e4e6' },
    ],
  },
  {
    id: 'tp-apple-watch-ultra-2',
    storeId: 'store-techno-baghdad',
    ownerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    name: 'ساعة آبل ألترا 2 (Apple Watch Ultra 2)',
    brand: 'Apple',
    category: 'audio_watches',
    categoryLabel: 'ساعات وسماعات',
    price: 990000,
    oldPrice: 1050000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 12,
    image: '/src/assets/images/product_smartwatch_audio_1794983264111.jpg',
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'هيكل تيتانيوم 49 ملم، شاشة ساطعة حتى 3000 شمعة، مقاومة ماء حتى عمق 100 متر، مع ميزة النقر المزدوج Double Tap.',
    specs: [
      { label: 'المقاس', value: '49 ملم هيكل تيتانيوم مخصص للمغامرات' },
      { label: 'الشاشة', value: 'شاشة OLED مسطحة 3000 nits' },
      { label: 'البطارية', value: 'حتى 36 ساعة استخدام عادي و72 ساعة بنمط التوفير' },
    ],
    storageOptions: [
      { label: 'إصدار GPS + خلوي (Cellular)', priceDelta: 0 },
    ],
    colors: [
      { name: 'تيتانيوم أسود مطفأ', hex: '#2b2d2f' },
      { name: 'تيتانيوم طبيعي', hex: '#b3afaa' },
    ],
  },
  {
    id: 'tp-anker-gan-prime-100w',
    storeId: 'store-techno-baghdad',
    ownerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    name: 'شاحن أنكر برايم 100 واط GaN ثلاثي المنافذ',
    brand: 'Anker',
    category: 'accessories',
    categoryLabel: 'شواحن وإكسسوارات',
    price: 85000,
    oldPrice: 95000,
    condition: 'جديد',
    inStock: true,
    warrantyMonths: 18,
    image: '/src/assets/images/product_gan_accessories_1794983264416.jpg',
    batteryHealth: 100,
    previouslyOpened: false,
    summary:
      'شاحن مدمج بتقنية GaNPrime لشحن اللابتوب والهاتف والتابلت في وقت واحد بأمان تام ونظام التبريد الذكي ActiveShield 2.0.',
    specs: [
      { label: 'القدرة الإجمالية', value: '100W Max' },
      { label: 'المنافذ', value: '2x USB-C + 1x USB-A' },
      { label: 'التوافق', value: 'يدعم iPhone, MacBook, iPad, Samsung PPS' },
    ],
    storageOptions: [
      { label: 'الحزمة القياسية', priceDelta: 0 },
    ],
    colors: [
      { name: 'أسود فحمي', hex: '#1f1f1f' },
    ],
  },
];

export const INITIAL_TRACKING_RECORDS: TrackingRecord[] = [
  {
    id: 'ORD-2026-4120',
    kind: 'order',
    storeId: 'store-techno-baghdad',
    storeOwnerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    customerId: 'customer-demo',
    customerName: 'كرار الربيعي',
    phone: '07714582901',
    governorate: 'بغداد',
    district: 'المنصور',
    title: 'طلب شراء آيفون 16 برو تيتانيوم',
    subtitle: 'سعة 256GB تيتانيوم صحراوي — ضمان رسمي 24 شهراً',
    createdAt: '2026-11-15 11:30',
    stage: 4,
    stageLabels: ['استلام الطلب', 'تجهيز الجهاز والفحص', 'في طريق التوصيل', 'تم التسليم وتفعيل الضمان'],
    estimatedReady: 'تم التسليم بنجاح',
    totalPrice: 1770000,
    deliveryFee: 0,
    notes: 'تم فحص الرقم التسلسلي وختم بطاقة الضمان الإلكترونية.',
    warrantyLabel: 'ضمان رسمي 24 شهراً مع تغطية العيوب المصنعية',
    warrantyQrCodeData: buildWarrantyQrData({
      id: 'ORD-2026-4120',
      storeName: 'تكنو فون — فرع المنصور الرئيسي',
      customerName: 'كرار الربيعي',
      title: 'آيفون 16 برو تيتانيوم 256GB',
      warrantyLabel: 'ضمان رسمي 24 شهراً مع استبدال مباشر',
      createdAt: '2026-11-15 11:30',
    }),
    reviewed: true,
  },
  {
    id: 'TP-1042',
    kind: 'repair',
    storeId: 'store-techno-baghdad',
    storeOwnerId: 'owner-techno-baghdad',
    storeName: 'تكنو فون — فرع المنصور الرئيسي',
    customerId: 'customer-demo',
    customerName: 'كرار الربيعي',
    phone: '07714582901',
    governorate: 'بغداد',
    district: 'المنصور',
    title: 'صيانة آيفون 14 برو — استبدال الشاشة الأصلية',
    subtitle: 'نقل معايرة True Tone ومقاومة الماء والختم المصنعي',
    createdAt: '2026-11-18 14:15',
    stage: 2,
    stageLabels: ['استلام الجهاز وفحصه', 'قيد العمل بالمختبر', 'فحص الجودة والمعايرة', 'جاهز للاستلام والتسليم'],
    estimatedReady: 'خلال 45 دقيقة',
    totalPrice: 140000,
    notes: 'تم فحص المايكرو أمبير وتثبيت شاشة أصلية جديدة، جاري المعايرة.',
    warrantyLabel: 'ضمان 12 شهراً على استجابة الشاشة واللمس',
  },
];

export const INITIAL_REVIEWS: VerifiedReview[] = [
  {
    id: 'rev-seed-1',
    storeId: 'store-techno-baghdad',
    bookingId: 'ORD-2026-4120',
    productId: 'tp-iphone-16-pro',
    customerId: 'customer-demo',
    customerName: 'كرار الربيعي',
    rating: 5,
    comment:
      'خدمة راقية جداً في فرع المنصور، الجهاز وصل بتغليف المصنع الأصلي مع فاتورة الضمان الإلكتروني ورمز الـ QR المفعل فوراً.',
    verifiedPurchase: true,
    createdAt: '2026-11-16 10:00',
  },
  {
    id: 'rev-seed-2',
    storeId: 'store-spectrum-basra',
    bookingId: 'ORD-BASRA-908',
    productId: 'tp-samsung-s24-ultra',
    customerId: 'cust-basra-1',
    customerName: 'عمار السعدي',
    rating: 5,
    comment:
      'أفضل تعامل في البصرة، تم استلام جهاز S24 ألترا بنفس اليوم مع سرعة خيالية في الرد على الاستفسارات.',
    verifiedPurchase: true,
    createdAt: '2026-11-17 18:30',
  },
];
