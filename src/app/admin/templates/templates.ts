import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DesignToken, DesignTokensService } from '../../core/design-tokens.service';
import { IconsService } from '../../core/icons.service';
import { OverrideValue, TemplateOverridesService } from '../../core/template-overrides.service';

interface TemplateCategory {
        id: string;
        label: string;
        /** أسماء متغيرات CSS التابعة لهذه الفئة — من مجموعتي "sizes" و"components" بملف tokens.json */
  vars: string[];
}

const CATEGORIES: TemplateCategory[] = [
    {
                id: 'buttons',
                label: 'الأزرار',
                vars: ['--radius-md', '--shadow-2', '--shadow-3', '--btn-hover-opacity', '--btn-active-opacity', '--btn-disabled-opacity'],
    },
    {
                id: 'cards',
                label: 'البطاقات',
                vars: ['--radius-lg', '--card-gap', '--shadow-1', '--card-hover-border-opacity'],
    },
    {
                id: 'badges',
                label: 'الشارات والحالات',
                vars: ['--radius-pill', '--radius-full'],
    },
    {
                id: 'fields',
                label: 'الحقول والقوائم',
                vars: ['--radius-sm', '--field-disabled-opacity', '--field-focus-border-opacity', '--select-bg', '--select-border'],
    },
    {
                id: 'icons',
                label: 'مقاسات الأيقونات',
                vars: ['--icon-sm', '--icon-md', '--icon-lg', '--icon-xl'],
    },
    {
                id: 'spacing',
                label: 'المسافات',
                vars: ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8'],
    },
    {
                id: 'shadows',
                label: 'الهالات (Shadows)',
                vars: ['--shadow-1', '--shadow-2', '--shadow-3', '--shadow-4', '--shadow-5'],
    },
    {
                id: 'layout',
                label: 'التخطيط العام',
                vars: ['--container-w', '--sidebar-w', '--topbar-h', '--breakpoint-mobile', '--radius-dashboard'],
    },
      ];

/**
 * قالب صفحة متكرر — بند 7 "قوالب الصفحات المتكررة" بملف الهوية
 * (08_هوية_وسيط_AI_الوثيقة_المصدر_v2_الصحيح.html، مصفوفة `templates`).
 * كل حقل هنا منقول حرفيًا من نفس الملف بلا أي صياغة جديدة:
 * `id` = مفتاح `v` بالهوية، و`name`/`desc`/`usage`/`note` نفس النصوص.
 */
export interface PageTemplate {
        id: string;
        name: string;
        desc: string;
        usage: string;
        /** ملاحظة إضافية موثّقة بالهوية لهذا القالب تحديدًا (إن وُجدت) */
  note?: string;
        /** هل يعرض القالب أيقونة فعلية ضمن معاينته الحية — مصدرها نص desc الموثّق لكل قالب */
  hasIcon: boolean;
}

/**
 * العشرون قالبًا كاملة وبنفس ترتيب ملف الهوية — بلا حذف ولا تبسيط لأي واحد منها.
 * توجيه المالك 2026-08-20: القوالب التي بلا أيقونة مطلوبة بنفس درجة القوالب ذات
 * الأيقونة تمامًا — لكل واحد منها هدف وربط محدد بالموقع موثّق بحقل usage أدناه.
 */
const PAGE_TEMPLATES: PageTemplate[] = [
    { id: 'dash', name: 'قالب لوحة (Dashboard Shell)', desc: 'topbar ثابت 56px + sidebar 220px + main، فوق خلفية bg-grid وجزيئات', usage: 'كل صفحات الإدارة، مقدم الخدمة، طالب الخدمة، الوسيط التسويقي', hasIcon: false },
    { id: 'site', name: 'قالب الموقع العام (Site Shell)', desc: 'header زجاجي ثابت + container بعرض 1240px + footer كامل (سوشال + قانوني)', usage: 'كل صفحات الموقع والسوق', hasIcon: false },
    { id: 'states5', name: 'بطاقة الحالات الخمس', desc: 'كل صفحة تعرض بيانات تغطي: Default · Loading · Empty · Error · Success', usage: 'إلزامي في كل صفحات اللوحات', hasIcon: false },
    { id: 'aidisc', name: 'بانر إفصاح الذكاء (ai-disclosure)', desc: 'أيقونة AI + تسمية بنفسجية + نص + شارة دقة/ثقة %', usage: 'أي صفحة فيها قرار أو اقتراح من الذكاء الاصطناعي', hasIcon: true },
    { id: 'wizard', name: 'معالج متعدد الخطوات (Wizard)', desc: 'دوائر مرقّمة (wr-step-num) بخط واصل؛ نشط=تدرج العلامة، مكتمل=تيل خافت، غير مكتمل=محايد', usage: 'التسجيل، إنشاء طلب/عرض، الاعتماد المرحلي', hasIcon: false },
    { id: 'tabs', name: 'تبويبات قسم (Tabs)', desc: 'خط سفلي تيل + لون نص عند التفعيل، قد تحمل شارة نوع تعديل (فوري/بمراجعة)', usage: 'صفحات الملف الشخصي والإعدادات المقسّمة لأقسام', hasIcon: false },
    { id: 'kpi', name: 'شبكة مؤشرات KPI', desc: 'بطاقة: مربع أيقونة ملوّن + رقم كبير وزن 900 + تسمية تحته', usage: 'لوحات التحكم الرئيسية، 4 أعمدة ديسكتوب / عمودان جوال', hasIcon: true },
    { id: 'table', name: 'جدول بيانات (ord-tbl/rep-tbl)', desc: 'رأس بلون نص ثانوي، فواصل صفوف خافتة، hover خلفية خفيفة', usage: 'الطلبات، الفواتير، السجلات', hasIcon: false },
    { id: 'slot', name: 'خانة فارغة (empty slot)', desc: 'حدود متقطعة، أيقونة خافتة، نص دعوة لإضافة عنصر', usage: 'مقارنة الخدمات، إضافة عنصر لقائمة', hasIcon: true },
    { id: 'modal', name: 'نافذة منبثقة (modal-box)', desc: 'خلفية زجاجية داكنة دوماً (حتى بالوضع الفاتح) + حقول وأزرار موحّدة', usage: 'التأكيدات، النماذج السريعة، التفاوض', hasIcon: false },
    { id: 'tier', name: 'بطاقة تدرّج المستوى (tier-banner)', desc: 'أيقونة نجمة بلون المستوى + نقاط تقدم (5) + نص الخطوات المتبقية للترقية', usage: 'ملف الوسيط التسويقي ومقدم الخدمة', hasIcon: true },
    { id: 'breadcrumb', name: 'مسار التنقل (breadcrumb)', desc: 'روابط متتالية يفصلها "/" أو "›" أو أيقونة سهم صغيرة (chevron)، آخر عنصر نص عادي غير قابل للنقر', usage: 'كل صفحات الموقع الداخلية ولوحات التفاصيل', hasIcon: true },
    { id: 'pagination', name: 'ترقيم الصفحات (pagination)', desc: 'زر سابق/تالي بأيقونة سهم + أرقام صفحات، الصفحة الحالية مميّزة بخلفية العلامة', usage: 'قوائم طويلة: نتائج البحث، جداول الإدارة', hasIcon: true },
    { id: 'toast', name: 'إشعار عابر (toast)', desc: 'شريط صغير يظهر أسفل الشاشة مؤقتاً لتأكيد إجراء (حفظ، إرسال، خطأ عملية)', usage: 'بعد أي إجراء ناجح أو فاشل في اللوحات', hasIcon: false },
    { id: 'tooltip', name: 'تلميح (tooltip-ico)', desc: 'دائرة صغيرة بعلامة "؟" مع title للشرح عند المرور — بلا مكوّن JS معقّد', usage: 'حقول الرسوم والنسب التي تحتاج توضيح مختصر', hasIcon: false },
    { id: 'emptystate', name: 'حالة فارغة عامة (empty-state)', desc: 'أيقونة خافتة + عنوان قصير يوضح سبب الفراغ (بحث بلا نتائج، قائمة محفوظات فارغة)', usage: 'نتائج البحث، المفضلة، الجداول بلا بيانات', hasIcon: true },
    { id: 'err', name: 'صفحات النظام والأخطاء (err-card)', desc: 'بطاقة مركزية: أيقونة ملوّنة حسب نوع الخطأ + كود + عنوان + وصف + أزرار إجراء. الألوان: 404=أحمر · 500=أحمر · صيانة/503=كهرماني · جلسة منتهية/401=أزرق · 403 ممنوع=أحمر', usage: 'قسم النظام والأخطاء بالموقع؛ يُقترح تعميمه على كل الأنظمة', hasIcon: true },
    { id: 'pref', name: 'صف إعداد بمفتاح تبديل (pref-row + toggle)', desc: 'عنوان + وصف على اليمين، مفتاح تبديل (sw/toggle-switch) بيضاوي على اليسار، مجمّعة داخل pref-card لكل قسم إعدادات', usage: 'كل صفحات تفضيلات الإشعارات والخصوصية والأمان', hasIcon: false },
    { id: 'radioref', name: 'زر اختيار (radio-opt)', desc: 'دائرة فارغة + نقطة داخلية عند الاختيار (radio-dot/radio-dot-inner)، تُستخدم داخل بطاقة قابلة للنقر كاملة لا دائرة صغيرة فقط', usage: 'اختيار نوع اتفاقية، خطط، تفضيلات مانعة للتعدد', hasIcon: false, note: 'معاينته البصرية موجودة بقسم 5. المكوّنات (مكتبة المكوّنات العامة) — بلا تكرار هنا' },
    { id: 'filterrail', name: 'شريط الفلترة (filter-rail)', desc: 'شريط زجاجي أفقي موحّد: تسمية تخصصات + pills تصفية · تسمية ترتيب + pills ترتيب · مسافة مرنة · بحث · عدّاد فلاتر نشطة + مسح + زر فلترة متقدمة (مؤكد حرفياً من P-PR-002.html)', usage: 'استكشاف الطلبات ومقدم الخدمة (P-PR-002)، وأي قائمة طويلة تحتاج تصفية/ترتيب/بحث معاً', hasIcon: false },
      ];

/** نوع الخانة القابلة للتحكم داخل معاينة قالب */
export type SlotKind = 'icon' | 'size' | 'count' | 'variant';

export interface TemplateSlotDef {
      key: string;
      kind: SlotKind;
      label: string;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
      /** لخانات النوع variant فقط — قائمة الفئات اللونية المتاحة فعليًا بـtemplates.css لهذا القالب */
  options?: { value: string; label: string }[];
    default: OverrideValue;
}

const KPI_VARIANTS = [
    { value: 'teal', label: 'تيل' },
    { value: 'blue', label: 'أزرق' },
    { value: 'kahr', label: 'كهرماني' },
    { value: 'ai', label: 'ذكاء اصطناعي' },
    ];
const ERR_VARIANTS = [
    { value: 'red', label: 'أحمر' },
    { value: 'kahr', label: 'كهرماني' },
    { value: 'blue', label: 'أزرق' },
    ];

/**
 * حصر كل خانة قابلة للتحكم داخل كل قالب من العشرين — أُضيف 2026-08-20 وفق طلب المالك
 * المباشر: "لازم يكون على كل منهم تحكم كامل: لون/تنسيق/حجم/أيقونة/أي شيء يخص كل عنصر".
 * النطاق محسوم بقرار المالك نفسه: خصائص التصميم فقط (أيقونة/حجم/عدد عناصر/فئة لونية) —
 * بلا نص محتوى (نظام النص له قواعد منفصلة). كل قيمة "default" هنا مطابقة حرفيًا لما كان
 * مثبّتًا بالكود القديم قبل هذا التحديث — بلا أي قيمة مخترَعة، ونفس القيم بالضبط موجودة
 * بملف template-overrides.json (الملف هو المصدر الحي، هذا فقط fallback أمان لو تعذّر التحميل).
 */
const TEMPLATE_SLOT_SCHEMAS: Record<string, TemplateSlotDef[]> = {
      dash: [
          { key: 'navCount', kind: 'count', label: 'عدد عناصر القائمة الجانبية', min: 1, max: 6, default: 4 },
          { key: 'avatarSize', kind: 'size', label: 'حجم أيقونة الحساب', min: 16, max: 32, unit: 'px', default: 22 },
            ],
      site: [
          { key: 'navLinkCount', kind: 'count', label: 'عدد روابط القائمة', min: 0, max: 5, default: 2 },
          { key: 'socialCount', kind: 'count', label: 'عدد أيقونات التواصل', min: 0, max: 6, default: 3 },
            ],
      states5: [
          { key: 'emptyIcon', kind: 'icon', label: 'أيقونة حالة "فارغ"', default: 'general:i-inbox' },
          { key: 'errorIcon', kind: 'icon', label: 'أيقونة حالة "خطأ"', default: 'general:i-warn' },
          { key: 'successIcon', kind: 'icon', label: 'أيقونة حالة "نجاح"', default: 'general:i-check' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونات', min: 12, max: 28, unit: 'px', default: 18 },
            ],
      aidisc: [
          { key: 'icon', kind: 'icon', label: 'الأيقونة', default: 'ai:ws-ai-spark' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 14, max: 32, unit: 'px', default: 22 },
            ],
      wizard: [
          { key: 'stepCount', kind: 'count', label: 'عدد الخطوات', min: 2, max: 3, default: 3 },
          { key: 'stepSize', kind: 'size', label: 'حجم دائرة الخطوة', min: 20, max: 36, unit: 'px', default: 26 },
            ],
      tabs: [
          { key: 'tabCount', kind: 'count', label: 'عدد التبويبات', min: 1, max: 3, default: 3 },
            ],
      kpi: [
          { key: 'cardCount', kind: 'count', label: 'عدد البطاقات', min: 1, max: 6, default: 4 },
          { key: 'icon0', kind: 'icon', label: 'أيقونة البطاقة 1', default: 'general:i-list' },
          { key: 'icon1', kind: 'icon', label: 'أيقونة البطاقة 2', default: 'general:i-star' },
          { key: 'icon2', kind: 'icon', label: 'أيقونة البطاقة 3', default: 'general:i-clock' },
          { key: 'icon3', kind: 'icon', label: 'أيقونة البطاقة 4', default: 'ai:ws-ai-spark' },
          { key: 'icon4', kind: 'icon', label: 'أيقونة البطاقة 5', default: 'general:i-list' },
          { key: 'icon5', kind: 'icon', label: 'أيقونة البطاقة 6', default: 'general:i-star' },
          { key: 'variant0', kind: 'variant', label: 'لون البطاقة 1', options: KPI_VARIANTS, default: 'teal' },
          { key: 'variant1', kind: 'variant', label: 'لون البطاقة 2', options: KPI_VARIANTS, default: 'blue' },
          { key: 'variant2', kind: 'variant', label: 'لون البطاقة 3', options: KPI_VARIANTS, default: 'kahr' },
          { key: 'variant3', kind: 'variant', label: 'لون البطاقة 4', options: KPI_VARIANTS, default: 'ai' },
          { key: 'variant4', kind: 'variant', label: 'لون البطاقة 5', options: KPI_VARIANTS, default: 'teal' },
          { key: 'variant5', kind: 'variant', label: 'لون البطاقة 6', options: KPI_VARIANTS, default: 'blue' },
          { key: 'iconSize', kind: 'size', label: 'حجم رسمة الأيقونة', min: 12, max: 22, unit: 'px', default: 16 },
          { key: 'iconBoxSize', kind: 'size', label: 'حجم مربع الأيقونة', min: 22, max: 40, unit: 'px', default: 30 },
            ],
      table: [
          { key: 'rowCount', kind: 'count', label: 'عدد الصفوف', min: 1, max: 3, default: 3 },
            ],
      slot: [
          { key: 'icon', kind: 'icon', label: 'الأيقونة', default: 'general:i-plus' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 14, max: 26, unit: 'px', default: 18 },
            ],
      modal: [
          { key: 'buttonCount', kind: 'count', label: 'عدد الأزرار', min: 1, max: 2, default: 2 },
            ],
      tier: [
          { key: 'icon', kind: 'icon', label: 'الأيقونة', default: 'general:i-star' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 12, max: 24, unit: 'px', default: 16 },
          { key: 'dotCount', kind: 'count', label: 'عدد نقاط التقدّم', min: 3, max: 8, default: 5 },
          { key: 'dotsOnCount', kind: 'count', label: 'عدد النقاط المكتملة', min: 0, max: 8, default: 3 },
            ],
      breadcrumb: [
          { key: 'separatorIcon', kind: 'icon', label: 'أيقونة الفاصل', default: 'ws-site:ws-chevron' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 8, max: 18, unit: 'px', default: 12 },
          { key: 'linkCount', kind: 'count', label: 'عدد الروابط (قبل العنصر الحالي)', min: 1, max: 2, default: 2 },
            ],
      pagination: [
          { key: 'arrowIcon', kind: 'icon', label: 'أيقونة الأسهم', default: 'ws-site:ws-chevron' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 8, max: 18, unit: 'px', default: 12 },
          { key: 'pageCount', kind: 'count', label: 'عدد أرقام الصفحات', min: 1, max: 7, default: 3 },
            ],
      toast: [
          { key: 'icon', kind: 'icon', label: 'الأيقونة', default: 'general:i-check' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 10, max: 20, unit: 'px', default: 15 },
            ],
      tooltip: [
          { key: 'iconSize', kind: 'size', label: 'حجم دائرة التلميح', min: 12, max: 22, unit: 'px', default: 16 },
            ],
      emptystate: [
          { key: 'icon', kind: 'icon', label: 'الأيقونة', default: 'general:i-search' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونة', min: 16, max: 30, unit: 'px', default: 22 },
            ],
      err: [
          { key: 'icon0', kind: 'icon', label: 'أيقونة 404', default: 'general:i-warn' },
          { key: 'icon1', kind: 'icon', label: 'أيقونة 500', default: 'general:i-warn' },
          { key: 'icon2', kind: 'icon', label: 'أيقونة 503', default: 'general:i-clock' },
          { key: 'icon3', kind: 'icon', label: 'أيقونة 401', default: 'general:i-lock' },
          { key: 'icon4', kind: 'icon', label: 'أيقونة 403', default: 'general:i-shield' },
          { key: 'variant0', kind: 'variant', label: 'لون 404', options: ERR_VARIANTS, default: 'red' },
          { key: 'variant1', kind: 'variant', label: 'لون 500', options: ERR_VARIANTS, default: 'red' },
          { key: 'variant2', kind: 'variant', label: 'لون 503', options: ERR_VARIANTS, default: 'kahr' },
          { key: 'variant3', kind: 'variant', label: 'لون 401', options: ERR_VARIANTS, default: 'blue' },
          { key: 'variant4', kind: 'variant', label: 'لون 403', options: ERR_VARIANTS, default: 'red' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونات', min: 14, max: 28, unit: 'px', default: 20 },
            ],
      pref: [
          { key: 'rowCount', kind: 'count', label: 'عدد صفوف الإعداد', min: 1, max: 2, default: 2 },
            ],
      radioref: [
          { key: 'optionCount', kind: 'count', label: 'عدد الخيارات', min: 1, max: 2, default: 2 },
            ],
      filterrail: [
          { key: 'specialtyPillCount', kind: 'count', label: 'عدد pills التخصصات', min: 1, max: 3, default: 3 },
          { key: 'sortPillCount', kind: 'count', label: 'عدد pills الترتيب', min: 1, max: 2, default: 2 },
          { key: 'searchIcon', kind: 'icon', label: 'أيقونة البحث', default: 'general:i-search' },
          { key: 'advIcon', kind: 'icon', label: 'أيقونة الفلترة المتقدمة', default: 'general:i-filter' },
          { key: 'iconSize', kind: 'size', label: 'حجم الأيقونات', min: 10, max: 18, unit: 'px', default: 12 },
            ],
};

/** المكتبات المسموح الاختيار منها لخانات النوع icon — نفس مكتبات ICON_REFS القديمة بلا توسّع عشوائي */
const ICON_PICKER_LIBS = ['general', 'ai', 'ws-site'];

@Component({
        selector: 'app-templates',
        standalone: true,
        imports: [],
        templateUrl: './templates.html',
        styleUrl: './templates.css',
})
      export class Templates implements OnInit {
        tokensService = inject(DesignTokensService);
        iconsService = inject(IconsService);
        overridesService = inject(TemplateOverridesService);
        private sanitizer = inject(DomSanitizer);
        activeCatId = signal<string>('buttons');

  readonly categories = CATEGORIES;

  /**
         * الوضع المعروض بالتبويب: قواعد التوكنات (العرض الأصلي كما هو) أو قوالب الصفحات
         * المتكررة الـ20. إضافة 2026-08-20 — لا يحذف أي شيء من العرض القديم إطلاقًا،
         * بل يضيف عرضًا ثانيًا بجانبه.
         */
  readonly view = signal<'tokens' | 'templates'>('tokens');

  /** العشرون قالبًا كاملة كما بملف الهوية — بلا حذف ولا تبسيط لأي واحد منها. */
  readonly pageTemplates = [...PAGE_TEMPLATES].sort((a, b) => (a.hasIcon === b.hasIcon ? 0 : a.hasIcon ? -1 : 1));

  /** يفتح/يغلق لوحة التحكم بخانات قالب معيّن — كل قالب مستقل، بلا تأثير على غيره */
  private readonly openEditors = signal<Record<string, boolean>>({});
      isEditorOpen(templateId: string): boolean {
              return !!this.openEditors()[templateId];
      }
      toggleEditor(templateId: string): void {
              this.openEditors.update(s => ({ ...s, [templateId]: !s[templateId] }));
      }

  /** خانات التحكم المتاحة لقالب معيّن — [] لو ما فيه خانات مُعرَّفة (نادر) */
  slotsFor(templateId: string): TemplateSlotDef[] {
          return TEMPLATE_SLOT_SCHEMAS[templateId] ?? [];
  }

  /** القيمة الحيّة الحالية لخانة — من الخدمة إن حُمِّلت، وإلا القيمة الافتراضية بالـschema */
  ov(templateId: string, slotKey: string): OverrideValue {
          const def = this.slotsFor(templateId).find(s => s.key === slotKey);
          return this.overridesService.valueOf(templateId, slotKey, def?.default ?? '');
  }

  /** نسخة رقمية من ov() — للاستخدام المباشر بـ[style.width.px] وما شابه */
  ovNum(templateId: string, slotKey: string): number {
          const v = this.ov(templateId, slotKey);
          return typeof v === 'number' ? v : parseFloat(String(v)) || 0;
  }

  onSlotInput(templateId: string, slot: TemplateSlotDef, event: Event): void {
          const raw = (event.target as HTMLInputElement | HTMLSelectElement).value;
          const value: OverrideValue = slot.kind === 'size' || slot.kind === 'count' ? (parseFloat(raw) || 0) : raw;
          this.overridesService.update(templateId, slot.key, value);
          this.overridesService.saveAll();
  }

  /** خريطة أيقونات المكتبات المتاحة للاختيار — تُبنى حيًّا من IconsService، بلا قائمة مكتوبة يدويًا */
  readonly iconPickerGroups = computed<{ libId: string; libLabel: string; items: { value: string; label: string }[] }[]>(() => {
          const libs = this.iconsService.libraries();
          return ICON_PICKER_LIBS
            .map(libId => {
                        const lib = libs.find(l => l.id === libId);
                        if (!lib) return null;
                        return {
                                      libId,
                                      libLabel: lib.label,
                                      items: lib.icons.map(ic => ({ value: `${libId}:${ic.slot}`, label: ic.label })),
                        };
            })
            .filter((g): g is { libId: string; libLabel: string; items: { value: string; label: string }[] } => g !== null);
  });

  /** يحوّل قيمة "معرّف_المكتبة:slot" لـSafeHtml جاهز للعرض، أو null لو غير موجودة */
  resolveIconSvg(ref: string): SafeHtml | null {
          const [libId, slot] = String(ref).split(':');
          const svg = this.iconsService.libraries().find(l => l.id === libId)?.icons.find(i => i.slot === slot)?.svg;
          return svg ? this.sanitizer.bypassSecurityTrustHtml(svg) : null;
  }

  /** أيقونة خانة معيّنة داخل قالب — اختصار لـov + resolveIconSvg معًا */
  slotIconSvg(templateId: string, slotKey: string): SafeHtml | null {
          return this.resolveIconSvg(String(this.ov(templateId, slotKey)));
  }

  /** مصفوفة 0..n-1 — لاستخدام @for بعدد ديناميكي بلا مصفوفة بيانات فعلية */
  range(n: number): number[] {
          return Array.from({ length: Math.max(0, n) }, (_, i) => i);
  }

  async ngOnInit(): Promise<void> {
              if (!this.tokensService.loaded()) await this.tokensService.loadAndApply();
              if (this.iconsService.libraries().length === 0) await this.iconsService.load();
              if (!this.overridesService.loaded()) await this.overridesService.loadAndApply();
  }

  setView(v: 'tokens' | 'templates'): void {
              this.view.set(v);
  }


  readonly activeCategory = computed(() => this.categories.find(c => c.id === this.activeCatId()) ?? this.categories[0]);

  /** كل توكنات الوضع الحالي مسطّحة بمصفوفة واحدة — لسهولة البحث بالـvar */
  private readonly flatTokens = computed<DesignToken[]>(() => this.tokensService.groups().flatMap(g => g.tokens));

  /** توكنات الفئة النشطة فقط، بترتيب `vars` المحدد بالفئة — يُستبعد أي var غير موجود فعليًا بالملف بدل عرض صف فارغ */
  readonly activeTokens = computed<DesignToken[]>(() => {
              const flat = this.flatTokens();
              return this.activeCategory().vars
                .map(v => flat.find(t => t.var === v))
                .filter((t): t is DesignToken => !!t);
  });

  selectCategory(id: string) {
              this.activeCatId.set(id);
  }

  tokenValue(varName: string): string {
              return this.flatTokens().find(t => t.var === varName)?.value ?? '';
  }

  sizeAsNumber(value: string): number {
              return parseFloat(value) || 0;
  }

  onSizeChange(varName: string, event: Event) {
              const raw = (event.target as HTMLInputElement).value;
              const n = parseFloat(raw);
              this.tokensService.updateTokenLive(varName, `${Number.isFinite(n) ? n : 0}px`);
  }

  onOpacityChange(varName: string, event: Event) {
              const value = (event.target as HTMLInputElement).value;
              this.tokensService.updateTokenLive(varName, value);
  }

  onTextChange(varName: string, event: Event) {
              const value = (event.target as HTMLInputElement).value;
              this.tokensService.updateTokenLive(varName, value);
  }
}
