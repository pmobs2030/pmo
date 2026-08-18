import { Component, computed, inject, signal } from '@angular/core';
import { DesignToken, DesignTokensService } from '../../core/design-tokens.service';

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

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
})
export class Templates {
  tokensService = inject(DesignTokensService);
  activeCatId = signal<string>('buttons');

  readonly categories = CATEGORIES;

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
