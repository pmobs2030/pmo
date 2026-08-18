import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { ThemeModeService } from './theme-mode.service';

export interface DesignToken {
  var: string;
  label: string;
  value: string;
  type: 'color' | 'gradient' | 'size' | 'weight' | 'font' | 'shadow' | 'opacity' | 'text';
}

export interface TokenGroup {
  id: string;
  label: string;
  tokens: DesignToken[];
}

export interface TokensFile {
  version: number;
  updatedAt: string;
  groups: TokenGroup[];
}

/** أحرف تسمح بكسر سياق تعريف CSS custom property (breakout إلى قواعد/تعليقات جديدة) — راجع تدقيق الأمان. */
const UNSAFE_CSS_VALUE_PATTERN = /[{}]|;\s*\S|\/\*|\*\//;

@Injectable({ providedIn: 'root' })
export class DesignTokensService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly themeMode = inject(ThemeModeService);
  private readonly http = inject(HttpClient);

  private readonly darkGroups = signal<TokenGroup[]>([]);
  private readonly lightGroups = signal<TokenGroup[]>([]);
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);

  /** المجموعة النشطة حاليًا لوحة التحرير — حسب الوضع المختار بمبدّل t-toggle (حالة مشتركة عبر ThemeModeService) */
  readonly groups = computed(() => (this.themeMode.mode() === 'dark' ? this.darkGroups() : this.lightGroups()));

  /**
   * يجيب توكنات الوضعين معًا (dark + light — من ملفين منفصلين يقومان مقام الـAPI مستقبلًا)
   * ويطبّق فورًا كCSS Custom Properties الوضع النشط الحالي على جذر الصفحة.
   * محاط بمعالجة أخطاء: فشل الجلب لا يُسقط بقية تهيئة التطبيق (كان ممكن يعلّق كامل الإقلاع
   * لو استُخدم هذا داخل provideAppInitializer بمشروع حقيقي فيه SSR أو شبكة غير مستقرة).
   */
  async loadAndApply(): Promise<void> {
    try {
      const [dark, light] = await Promise.all([
        firstValueFrom(
          this.http.get<TokensFile>('assets/design-tokens/tokens.json').pipe(catchError(() => of(null)))
        ),
        firstValueFrom(
          this.http.get<TokensFile>('assets/design-tokens/tokens-light.json').pipe(catchError(() => of(null)))
        ),
      ]);
      if (!dark || !light) {
        this.loadError.set('تعذّر تحميل ملفات التوكنات (tokens.json / tokens-light.json).');
        return;
      }
      this.darkGroups.set(dark.groups);
      this.lightGroups.set(light.groups);
      this.applyAll();
      this.loaded.set(true);
    } catch (err) {
      // لا نرمي الخطأ للأعلى: فشل تحميل توكنات التصميم لا يجب أن يمنع بقية التطبيق من الإقلاع.
      this.loadError.set('خطأ غير متوقع أثناء تحميل التوكنات.');
      console.error('DesignTokensService.loadAndApply failed:', err);
    }
  }

  /** تبديل وضع التحرير المعروض باللوحة (لا يمس الموقع الحي — لوحة تحرير فقط) */
  setMode(mode: 'dark' | 'light'): void {
    this.themeMode.setMode(mode);
    this.applyAll();
  }

  /** يطبّق كل توكنات الوضع النشط حاليًا على :root (معاينة اللوحة نفسها) — محمي لبيئات SSR بلا DOM */
  applyAll(): void {
    if (!this.isBrowser) return;
    for (const group of this.groups()) {
      for (const token of group.tokens) {
        document.documentElement.style.setProperty(token.var, token.value);
      }
    }
  }

  /** يتحقق أن قيمة التوكن لا تحتوي رموزًا قد تكسر سياق تعريف CSS (حماية من CSS injection عبر التصدير) */
  private assertSafeCssValue(value: string): string {
    if (UNSAFE_CSS_VALUE_PATTERN.test(value)) {
      throw new Error(`قيمة توكن غير صالحة (تحتوي رمز CSS محظورة قد تكسر سياق التعريف): ${value}`);
    }
    return value;
  }

  /** يحدّث قيمة توكن واحد بالذاكرة (بالوضع النشط فقط) ويطبّقه حيًا فورًا (معاينة مباشرة) */
  updateTokenLive(varName: string, value: string): void {
    const safeValue = this.assertSafeCssValue(value);
    if (this.isBrowser) {
      document.documentElement.style.setProperty(varName, safeValue);
    }
    const isDark = this.themeMode.mode() === 'dark';
    const target = isDark ? this.darkGroups : this.lightGroups;
    // تحديث غير-مُغيِّر (immutable) — بلا تعديل مباشر على كائنات داخل الـsignal، تماشيًا مع توصية Angular signals
    target.set(
      target().map(group => ({
        ...group,
        tokens: group.tokens.map(t => (t.var === varName ? { ...t, value: safeValue } : t)),
      }))
    );
  }

  /**
   * حفظ (مؤقتًا: طباعة الحالة الحالية فقط — لاحقًا يستبدل بنداء API حقيقي
   * يخزّن القيم بقاعدة البيانات مع سجل تاريخي).
   * تنبيه أمني للمطوّر الذي سيربط API حقيقي: يجب إعادة التحقق (validation) من كل قيمة على السيرفر
   * أيضًا، لا يكفي تحقق العميل هنا وحده — راجع تدقيق الأمان المرفق بمجلد المراجع.
   */
  async saveAll(): Promise<{ ok: boolean; tokensCount: number }> {
    const count = this.darkGroups().reduce((sum, g) => sum + g.tokens.length, 0)
      + this.lightGroups().reduce((sum, g) => sum + g.tokens.length, 0);
    // TODO: استبدال هذا بنداء POST حقيقي لباك إند حقيقي وقت الربط بالمشروع الفعلي، مع تحقق سيرفر-سايد كامل
    console.log('حفظ (محاكاة) — الوضعين معًا:', JSON.stringify({ dark: this.darkGroups(), light: this.lightGroups() }));
    return { ok: true, tokensCount: count };
  }

  /**
   * تصدير CSS مستقل — الحل التقني للنقل الحقيقي بدون أي وصول لكود مصدر الموقع الحي:
   * يولّد ملف CSS خاص واحد يغطي **الوضعين معًا** (فاتح كقيم افتراضية + داكن كتجاوز)، مستقل تمامًا عن
   * Angular — يشتغل بأي موقع/تقنية (يُدرج بـ<link> عادي). كل قيمة تمر أولاً بـ`assertSafeCssValue`
   * لمنع أي احتمال كسر سياق CSS بالملف المصدَّر (حماية أمان — راجع تدقيق الأمان بمجلد المراجع).
   */
  generateCssText(): string {
    const lines: string[] = [];
    lines.push('/* ==========================================================');
    lines.push('   وسيط AI — توكنات التصميم (الوضعان الداكن والفاتح معًا)');
    lines.push('   مولَّد تلقائيًا من لوحة تحكم الهوية — لا تُعدَّل يدويًا هنا،');
    lines.push('   عدّل من اللوحة وأعد التصدير.');
    lines.push(`   تاريخ التصدير: ${new Date().toISOString()}`);
    lines.push('   ========================================================== */');
    lines.push('');
    lines.push(':root {');
    lines.push('  /* الوضع الفاتح — القيم الافتراضية (بلا صنف على <html>) */');
    for (const group of this.lightGroups()) {
      lines.push(`  /* — ${group.label} — */`);
      for (const token of group.tokens) {
        lines.push(`  ${token.var}: ${this.assertSafeCssValue(token.value)};`);
      }
    }
    lines.push('}');
    lines.push('');
    lines.push('html.dark {');
    lines.push('  /* الوضع الداكن — تجاوز عند وجود class="dark" على <html> */');
    for (const group of this.darkGroups()) {
      lines.push(`  /* — ${group.label} — */`);
      for (const token of group.tokens) {
        lines.push(`  ${token.var}: ${this.assertSafeCssValue(token.value)};`);
      }
    }
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  /** ينسخ CSS المولَّد للحافظة مباشرة (زر "نسخ" باللوحة) — محمي لبيئات SSR بلا navigator.clipboard */
  async copyCssToClipboard(): Promise<void> {
    if (!this.isBrowser || !navigator.clipboard) return;
    await navigator.clipboard.writeText(this.generateCssText());
  }

  /** يحمّل CSS المولَّد كملف .css جاهز للتسليم للمبرمج أو الإدراج المباشر بالموقع — محمي لبيئات SSR */
  downloadCss(filename = 'waseetai-tokens.css'): void {
    if (!this.isBrowser) return;
    const blob = new Blob([this.generateCssText()], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
