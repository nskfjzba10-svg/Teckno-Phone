import React, { useState } from 'react';
import { Download, MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        // User dismissed or cancelled; no extra modal needed
        return;
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="تثبيت تكنو فون على الشاشة الرئيسية"
        className={
          variant === 'card'
            ? `inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors cursor-pointer min-h-[44px] whitespace-nowrap shrink-0 ${className}`
            : `inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors cursor-pointer min-h-[40px] whitespace-nowrap shrink-0 ${className}`
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className={variant === 'card' ? '' : 'hidden sm:inline'}>
          تثبيت التطبيق
        </span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="أيقونة تكنو فون"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div>
                  <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    تثبيت تطبيق تكنو فون
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    أضف التطبيق إلى الشاشة الرئيسية لتصفح أسرع بملء الشاشة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="إغلاق"
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 leading-relaxed">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>خطوات التثبيت على أجهزة iPhone / iPad (Safari):</span>
                </div>
                <ol className="space-y-2 list-decimal list-inside">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>1. اضغط على زر المشاركة</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold text-blue-700 dark:text-blue-400">
                      <Share className="w-3.5 h-3.5" />
                      مشاركة
                    </span>
                    <span>في شريط Safari بالأسفل.</span>
                  </li>
                  <li>
                    2. مرر للأسفل واختر{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      إضافة إلى الشاشة الرئيسية (Add to Home Screen)
                    </strong>
                    .
                  </li>
                  <li>
                    3. اضغط <strong className="text-slate-900 dark:text-slate-100">إضافة (Add)</strong> في الزاوية العلوية.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 leading-relaxed">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>خطوات التثبيت على Android أو المتصفح:</span>
                </div>
                <ol className="space-y-2">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>1. افتح قائمة المتصفح</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </span>
                    <span>أعلى أو أسفل الشاشة.</span>
                  </li>
                  <li>
                    2. اختر{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      تثبيت التطبيق (Install app)
                    </strong>{' '}
                    أو{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      الإضافة إلى الشاشة الرئيسية
                    </strong>
                    .
                  </li>
                  <li className="text-[11px] text-slate-500 dark:text-slate-400">
                    ملاحظة: تأكد من فتح رابط الموقع مباشرة في Chrome أو Safari وليس من نافذة معاينة مصغرة.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl cursor-pointer min-h-[44px]"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
