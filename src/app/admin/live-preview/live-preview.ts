import { Component, OnInit, inject } from '@angular/core';
import { DesignTokensService } from '../../core/design-tokens.service';
import { IconsService } from '../../core/icons.service';
import { TypographyService } from '../../core/typography.service';
import { ThemeModeService } from '../../core/theme-mode.service';

/**
 * معاينة حية شاملة — إضافة 2026-08-18 (اختيار المالك). لوحة تجريبية (mock dashboard)
 * كاملة تستخدم كل التوكنات سوية بنفس الوقت — على عكس معاينات كل تبويب المنفصلة، هذي
 * الصفحة تكشف تعارضات لا تظهر إلا لما تشوف كل العناصر مع بعض بسياق واقعي.
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

  async ngOnInit() {
    if (!this.tokensService.loaded()) await this.tokensService.loadAndApply();
    if (this.iconsService.libraries().length === 0) await this.iconsService.load();
    if (this.typographyService.roles().length === 0) await this.typographyService.load();
  }

  setMode(mode: 'dark' | 'light') {
    this.tokensService.setMode(mode);
  }
}
