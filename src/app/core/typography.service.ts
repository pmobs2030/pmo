import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { PersistenceService } from './persistence.service';

export interface FontFamily {
  id: string;
  var: string;
  label: string;
  value: string;
  stack: string;
  source: string;
  availableWeights: number[];
}

export interface TypeRole {
  id: string;
  label: string;
  usage: string;
  familyRef: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  interpolated?: boolean;
  interpolatedNote?: string;
}

export interface TypographyFile {
  version: number;
  updatedAt: string;
  note?: string;
  families: FontFamily[];
  roles: TypeRole[];
}

const VALID_WEIGHTS = [400, 500, 600, 700, 800, 900];
const SIZE_PATTERN = /^\d+(\.\d+)?(px|rem|em)$/;
const LETTER_SPACING_PATTERN = /^(normal|-?\d+(\.\d+)?(em|px))$/;

/**
 * خدمة إدارة الخطوط الكاملة — أُضيفت 2026-08-18 (قرار المالك: تحكم كامل بكل نوع نص
 * بالهوية: نوع الخط، الحجم، الوزن، تباعد الأسطر، تباعد الأحرف، لكل مكان استخدام).
 * نفس نمط DesignTokensService معماريًا، لكن بتحقق نوعي صارم لكل حقل (كان غائبًا
 * كليًا بمحرر التوكنات العام — حقل line-height/letter-spacing كان نص حر بلا تحقق).
 */
@Injectable({ providedIn: 'root' })
export class TypographyService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly persistence = inject(PersistenceService);

  readonly families = signal<FontFamily[]>([]);
  readonly roles = signal<TypeRole[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly lastFieldError = signal<{ roleId: string; field: string; message: string } | null>(null);

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<TypographyFile>('assets/design-tokens/typography.json').pipe(catchError(() => of(null)))
    );
    if (!data) {
      this.loadError.set('تعذّر تحميل ملف الخطوط (typography.json).');
      return;
    }
    const saved = this.persistence.load<{ families: FontFamily[]; roles: TypeRole[] }>('typography');
    this.families.set(saved?.data.families ?? data.families);
    this.roles.set(saved?.data.roles ?? data.roles);
    this.applyAll();
  }

  /** يطبّق كل متغيرات الخط الحالية على :root (نفس أسلوب DesignTokensService) */
  applyAll(): void {
    if (!this.isBrowser) return;
    for (const fam of this.families()) {
      document.documentElement.style.setProperty(fam.var, fam.value);
    }
    for (const role of this.roles()) {
      document.documentElement.style.setProperty(`--fs-${role.id}`, role.fontSize);
      document.documentElement.style.setProperty(`--fw-${role.id}`, String(role.fontWeight));
      document.documentElement.style.setProperty(`--lh-${role.id}`, String(role.lineHeight));
      document.documentElement.style.setProperty(`--ls-${role.id}`, role.letterSpacing);
    }
  }

  familyLabel(id: string): string {
    return this.families().find(f => f.id === id)?.label ?? id;
  }

  updateFamilyValue(familyId: string, value: string): void {
    this.families.set(this.families().map(f => (f.id === familyId ? { ...f, value } : f)));
    this.applyAll();
  }

  updateRoleFamily(roleId: string, familyRef: string): void {
    this.roles.set(this.roles().map(r => (r.id === roleId ? { ...r, familyRef } : r)));
    this.applyAll();
  }

  /** تحديث حقل واحد بدور نصي — مع تحقق نوعي صارم بحسب الحقل (كان غائبًا بالكامل بالنظام القديم) */
  updateRoleField(roleId: string, field: 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing', rawValue: string): boolean {
    let value: string | number = rawValue;
    if (field === 'fontSize') {
      if (!SIZE_PATTERN.test(rawValue)) {
        this.lastFieldError.set({ roleId, field, message: 'الحجم يجب أن يكون رقمًا متبوعًا بـ px أو rem أو em (مثال: 16px).' });
        return false;
      }
    } else if (field === 'fontWeight') {
      const n = parseInt(rawValue, 10);
      if (!VALID_WEIGHTS.includes(n)) {
        this.lastFieldError.set({ roleId, field, message: 'الوزن يجب أن يكون أحد القيم القياسية: 400/500/600/700/800/900.' });
        return false;
      }
      value = n;
    } else if (field === 'lineHeight') {
      const n = parseFloat(rawValue);
      if (!Number.isFinite(n) || n < 1 || n > 2.5) {
        this.lastFieldError.set({ roleId, field, message: 'تباعد الأسطر يجب أن يكون رقمًا بين 1 و2.5.' });
        return false;
      }
      value = n;
    } else if (field === 'letterSpacing') {
      if (!LETTER_SPACING_PATTERN.test(rawValue)) {
        this.lastFieldError.set({ roleId, field, message: 'تباعد الأحرف يجب أن يكون "normal" أو رقمًا بوحدة em/px (مثال: 0.02em).' });
        return false;
      }
    }
    this.lastFieldError.set(null);
    this.roles.set(this.roles().map(r => (r.id === roleId ? { ...r, [field]: value } : r)));
    this.applyAll();
    return true;
  }

  errorFor(roleId: string, field: string): string | null {
    const err = this.lastFieldError();
    return err && err.roleId === roleId && err.field === field ? err.message : null;
  }

  save(): boolean {
    return this.persistence.save('typography', { families: this.families(), roles: this.roles() });
  }

  exportJson(): void {
    this.persistence.downloadJson('waseetai-typography.json', {
      version: 1, updatedAt: new Date().toISOString(), families: this.families(), roles: this.roles(),
    });
  }

  async importJson(file: File): Promise<{ ok: boolean; error?: string }> {
    const result = await this.persistence.readJsonFile<TypographyFile>(file);
    if (!result.ok) return { ok: false, error: result.error };
    if (!Array.isArray(result.data.roles) || !Array.isArray(result.data.families)) {
      return { ok: false, error: 'بنية الملف غير صالحة — يجب أن يحتوي families و roles.' };
    }
    this.families.set(result.data.families);
    this.roles.set(result.data.roles);
    this.persistence.save('typography', { families: result.data.families, roles: result.data.roles });
    this.applyAll();
    return { ok: true };
  }

  async resetToSource(): Promise<void> {
    this.persistence.clear('typography');
    await this.load();
  }

  /** يولّد جزء CSS خاص بالخطوط — يُدمَج مع بقية التصدير بتبويب export-css مستقبلًا */
  generateCssPart(): string {
    const lines: string[] = ['  /* — الخطوط (Typography) — */'];
    for (const fam of this.families()) {
      lines.push(`  ${fam.var}: '${fam.value}', system-ui, sans-serif;`);
    }
    for (const role of this.roles()) {
      lines.push(`  --fs-${role.id}: ${role.fontSize};`);
      lines.push(`  --fw-${role.id}: ${role.fontWeight};`);
      lines.push(`  --lh-${role.id}: ${role.lineHeight};`);
      lines.push(`  --ls-${role.id}: ${role.letterSpacing};`);
    }
    return lines.join('\n');
  }
}
