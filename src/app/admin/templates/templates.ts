import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DesignToken, DesignTokensService } from '../../core/design-tokens.service';
import { IconsService } from '../../core/icons.service';

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
  readonly pageTemplates = PAGE_TEMPLATES;

  /**
     * الأيقونات المستخدمة داخل معاينات القوالب — تُقرأ حيًّا من IconsService (نفس نمط
     * style-guide.ts وlive-preview.ts) بلا أي شكل SVG مكتوب يدويًا هنا.
     * كل عنصر: [المفتاح المحلي، معرّف المكتبة، اسم الـslot].
     */
  private static readonly ICON_REFS: ReadonlyArray<readonly [string, string, string]> = [
        ['ai', 'ai', 'ws-ai-spark'],
        ['check', 'general', 'i-check'],
        ['warn', 'general', 'i-warn'],
        ['inbox', 'general', 'i-inbox'],
        ['search', 'general', 'i-search'],
        ['star', 'general', 'i-star'],
        ['clock', 'general', 'i-clock'],
        ['lock', 'general', 'i-lock'],
        ['shield', 'general', 'i-shield'],
        ['plus', 'general', 'i-plus'],
        ['filter', 'general', 'i-filter'],
        ['list', 'general', 'i-list'],
        ['chevron', 'ws-site', 'ws-chevron'],
      ];

  /**
     * خريطة أيقونات مستقرّة (computed) — تتجنّب إنشاء كائن SafeHtml جديد بكل دورة كشف
     * تغيّر، وتُرجع null لأي slot غير موجود بدل كسر القالب.
     */
  readonly icons = computed<Record<string, SafeHtml | null>>(() => {
        const libs = this.iconsService.libraries();
        const out: Record<string, SafeHtml | null> = {};
        for (const [key, libId, slot] of Templates.ICON_REFS) {
                const svg = libs.find(l => l.id === libId)?.icons.find(i => i.slot === slot)?.svg;
                out[key] = svg ? this.sanitizer.bypassSecurityTrustHtml(svg) : null;
        }
        return out;
  });

  async ngOnInit(): Promise<void> {
        if (!this.tokensService.loaded()) await this.tokensService.loadAndApply();
        if (this.iconsService.libraries().length === 0) await this.iconsService.load();
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
