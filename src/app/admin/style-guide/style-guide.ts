import { Component, OnInit, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DesignTokensService } from '../../core/design-tokens.service';
import { IconsService } from '../../core/icons.service';
import { TypographyService } from '../../core/typography.service';
import { ThemeModeService } from '../../core/theme-mode.service';

/**
 * دليل الأنماط الموحّد — إضافة 2026-08-18 (اختيار المالك). صفحة واحدة تجمع كل نظام
 * التصميم (ألوان + خطوط + أيقونات + مقاسات) من نفس بيانات الخدمات الحيّة — بلا أي
 * إدخال يدوي إضافي، قابلة للمشاركة مع أي مبرمج ينضم للفريق لاحقًا.
 */
@Component({
  selector: 'app-style-guide',
  standalone: true,
  imports: [],
  templateUrl: './style-guide.html',
  styleUrl: './style-guide.css'
})
export class StyleGuide implements OnInit {
  tokensService = inject(DesignTokensService);
  iconsService = inject(IconsService);
  typographyService = inject(TypographyService);
  themeMode = inject(ThemeModeService);
  private sanitizer = inject(DomSanitizer);

  async ngOnInit() {
    if (!this.tokensService.loaded()) await this.tokensService.loadAndApply();
    if (this.iconsService.libraries().length === 0) await this.iconsService.load();
    if (this.typographyService.roles().length === 0) await this.typographyService.load();
  }

  readonly colorGroups = computed(() =>
    this.tokensService.groups().filter(g => g.tokens.some(t => t.type === 'color' || t.type === 'gradient'))
  );

  readonly sizeTokens = computed(() =>
    this.tokensService.groups().flatMap(g => g.tokens).filter(t => t.type === 'size')
  );

  setMode(mode: 'dark' | 'light') {
    this.tokensService.setMode(mode);
  }

  safeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
