import { Component, computed, inject } from '@angular/core';
import { DesignTokensService } from '../../core/design-tokens.service';
import { ThemeMode, ThemeModeService } from '../../core/theme-mode.service';

interface PaletteSwatch {
  label: string;
  value: string;
}

/** توكنات فيها قيمتان موثّقتان بمكانين مختلفين بملف الهوية بلا ترجيح واضح — تُعرَض كخيارين سريعين
 *  بدل ترجيح تعسفي لواحدة (بطلب صريح من المستخدم، انظر القرار 21 بسجل القرارات). */
const DOCUMENTED_ALTERNATES: Record<string, PaletteSwatch[]> = {
  '--navy-dashboard': [
    { label: 'المصدر 1 (نص التوثيق، سطر 931)', value: 'rgba(246,248,252,.96)' },
    { label: 'المصدر 2 (تنفيذ اللوحة الفعلي، سطر 1241)', value: 'rgba(246,248,252,.92)' },
  ],
};

@Component({
  selector: 'app-color-tokens',
  standalone: true,
  imports: [],
  templateUrl: './color-tokens.html',
  styleUrl: './color-tokens.css'
})
export class ColorTokens {
  tokensService = inject(DesignTokensService);
  themeModeService = inject(ThemeModeService);
  saving = false;
  savedMsg = '';
  readonly weightOptions = [400, 500, 600, 700, 800, 900];

  /** لوحة ألوان جاهزة (Preset Palette) مبنية حيًا من الألوان الأساسية بالمشروع (تيل/أزرق/AI/أخضر/كهرماني/أحمر)
   *  + محايدان (أبيض/أسود) — تُعرَض كمربعات قابلة للنقر فوق كل حقل لون، بجانب إدخال hex اليدوي الموجود أصلاً. */
  readonly commonPalette = computed<PaletteSwatch[]>(() => {
    const groups = this.tokensService.groups();
    const find = (v: string) => groups.flatMap(g => g.tokens).find(t => t.var === v)?.value;
    const entries: [string, string | undefined][] = [
      ['تيل', find('--teal')], ['أزرق', find('--blue')], ['ذكاء اصطناعي', find('--ai')],
      ['أخضر', find('--green')], ['كهرماني', find('--kahr')], ['أحمر', find('--red')],
    ];
    const swatches: PaletteSwatch[] = entries
      .filter((e): e is [string, string] => !!e[1] && this.isSolidColor(e[1]))
      .map(([label, value]) => ({ label, value }));
    swatches.push({ label: 'أبيض', value: '#FFFFFF' }, { label: 'أسود', value: '#000000' });
    return swatches;
  });

  alternatesFor(varName: string): PaletteSwatch[] {
    return DOCUMENTED_ALTERNATES[varName] ?? [];
  }

  setMode(mode: ThemeMode) {
    this.tokensService.setMode(mode);
  }

  onValueChange(varName: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.tokensService.updateTokenLive(varName, value);
  }

  /** يُستدعى عند النقر على مربع من لوحة الألوان الجاهزة أو أحد "البدائل الموثّقة" */
  pickPaletteColor(varName: string, value: string) {
    this.tokensService.updateTokenLive(varName, value);
  }

  onSizeChange(varName: string, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const n = parseFloat(raw);
    this.tokensService.updateTokenLive(varName, `${Number.isFinite(n) ? n : 0}px`);
  }

  onWeightChange(varName: string, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.tokensService.updateTokenLive(varName, value);
  }

  isSolidColor(value: string): boolean {
    return value.startsWith('#') || (value.startsWith('rgba') && !value.includes('gradient'));
  }

  toHex(value: string): string {
    if (value.startsWith('#')) return value;
    const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const [_, r, g, b] = m;
      const toHexPart = (n: string) => parseInt(n, 10).toString(16).padStart(2, '0');
      return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
    }
    return '#000000';
  }

  sizeAsNumber(value: string): number {
    return parseFloat(value.replace('px', '')) || 0;
  }

  async save() {
    this.saving = true;
    const res = await this.tokensService.saveAll();
    this.saving = false;
    this.savedMsg = res.ok ? `تم حفظ ${res.tokensCount} توكن (الوضعين معًا — محاكاة محلية، بانتظار ربط الـAPI الحقيقي)` : 'خطأ بالحفظ';
    setTimeout(() => (this.savedMsg = ''), 4000);
  }
}
