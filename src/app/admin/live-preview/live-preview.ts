import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DesignTokensService } from '../../core/design-tokens.service';
import { IconsService } from '../../core/icons.service';
import { TypographyService } from '../../core/typography.service';
import { ThemeModeService } from '../../core/theme-mode.service';

/**
 * معاينة حية شاملة — إضافة 2026-08-18 (اختيار المالك). لوحة تجريبية (mock dashboard)
 * كاملة تستخدم كل التوكنات سوية بنفس الوقت — على عكس معاينات كل تبويب المنفصلة، هذي
 * الصفحة تكشف تعارضات لا تظهر إلا لما تشوف كل العناصر مع بعض بسياق واقعي.
 *
 * إصلاح 2026-08-19 (ملاحظة مباشرة من المالك بعد الفحص البصري الأول):
 * 1) روابط الشريط الجانبي (الطلبات/المحفظة/الإعدادات) كانت وسوم <a> ثابتة بلا أي تنقل —
 *    أصبحت الآن تبدّل قسم المحتوى فعليًا عبر activeSection.
 * 2) شارة "الذكاء الاصطناعي" كانت تستخدم إيموجي ✨ حرفي بدل الأيقونة والألوان المعتمدة
 *    فعليًا من icons.json (مكتبة "ai"، slot "ws-ai-spark"، colorVar "--ai-txt") — الإيموجي
 *    يرسم بلونه الافتراضي من خط النظام ويتجاهل CSS color، فكان يخالف قاعدة الهوية
 *    "أي أيقونة تخص الذكاء تكون بنفس لونها المعتمد". أصبحت الآن تُقرأ حيًّا من IconsService
 *    مثل بقية اللوحة تمامًا (نفس نمط style-guide.ts) بدل أي قيمة مُدخلة يدويًا.
 */
@Component({
  selector: 'app-live-preview',
  standalone: true,
  imports: [],
  templateUrl: './live-preview.html',
  styleUrl: './live-preview.css'
})
export class LivePreview implements OnInit {
  tokensService = inject(DesignTokensService);
  iconsService = inject(IconsService);
  typographyService = inject(TypographyService);
  themeMode = inject(ThemeModeService);
  private sanitizer = inject(DomSanitizer);

  readonly activeSection = signal<'dashboard' | 'requests' | 'wallet' | 'settings'>('dashboard');

  async ngOnInit() {
    if (!this.tokensService.loaded()) await this.tokensService.loadAndApply();
    if (this.iconsService.libraries().length === 0) await this.iconsService.load();
    if (this.typographyService.roles().length === 0) await this.typographyService.load();
  }

  setMode(mode: 'dark' | 'light') {
    this.tokensService.setMode(mode);
  }

  setSection(section: 'dashboard' | 'requests' | 'wallet' | 'settings') {
    this.activeSection.set(section);
  }

  /** أيقونة "شرارة الذكاء" المعتمدة من مكتبة ai — نفس مصدر باقي اللوحة، بلا أي قيمة مكتوبة يدويًا هنا. */
  readonly aiIconSvg = computed(() => {
    const lib = this.iconsService.libraries().find(l => l.id === 'ai');
    const icon = lib?.icons.find(i => i.slot === 'ws-ai-spark');
    return icon?.svg ?? null;
  });

  safeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
