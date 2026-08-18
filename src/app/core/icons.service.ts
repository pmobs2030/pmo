import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { PersistenceService } from './persistence.service';

export interface IconItem {
  slot: string;
  label: string;
  svg: string;
}

export interface IconLibrary {
  id: string;
  label: string;
  colorVar: string;
  icons: IconItem[];
}

export interface IconsFile {
  version: number;
  libraries: IconLibrary[];
}

@Injectable({ providedIn: 'root' })
export class IconsService {
  readonly libraries = signal<IconLibrary[]>([]);
  readonly loadError = signal<string | null>(null);

  private readonly persistence = inject(PersistenceService);

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<IconsFile>('assets/design-tokens/icons.json').pipe(catchError(() => of(null)))
    );
    if (!data) {
      this.loadError.set('تعذّر تحميل ملف الأيقونات (icons.json).');
      return;
    }
    // إصلاح 2026-08-18: استخدم نسخة محفوظة محليًا إن وُجدت بدل تجاهلها دائمًا لصالح الملف الأصلي.
    const saved = this.persistence.load<IconLibrary[]>('icons');
    this.libraries.set(saved?.data ?? data.libraries);
  }

  /** حفظ حقيقي محليًا — كان غايبًا كليًا (لا استمرارية إطلاقًا قبل هذا التاريخ) */
  save(): boolean {
    return this.persistence.save('icons', this.libraries());
  }

  exportJson(): void {
    this.persistence.downloadJson('waseetai-icons.json', {
      version: 1, updatedAt: new Date().toISOString(), libraries: this.libraries(),
    });
  }

  async importJson(file: File): Promise<{ ok: boolean; error?: string }> {
    const result = await this.persistence.readJsonFile<IconsFile>(file);
    if (!result.ok) return { ok: false, error: result.error };
    if (!Array.isArray(result.data.libraries)) {
      return { ok: false, error: 'بنية الملف غير صالحة — يجب أن يحتوي مصفوفة libraries.' };
    }
    this.libraries.set(result.data.libraries);
    this.persistence.save('icons', result.data.libraries);
    return { ok: true };
  }

  /**
   * يعيد تعيين شكل SVG لمكان (slot) معيّن، من نفس المكتبة فقط
   * (يمنع بنيويًا خلط أشكال عامة مع أشكال AI — قاعدة الحصرية بالهوية).
   *
   * ملاحظة أمان مهمة (راجع تدقيق الأمان بمجلد المراجع): `newSvg` يُعرَض لاحقًا عبر
   * `[innerHTML]` بعد `bypassSecurityTrustHtml` — هذا آمن اليوم لأن كل قيم svg تأتي حصرًا
   * من ملف icons.json المرفق بالبناء (لا مصدر مستخدم/شبكة). **إذا رُبطت هذه الدالة مستقبلاً
   * بمصدر بيانات ديناميكي (API، رفع مستخدم)، يجب فرض قائمة سماح مغلقة أو تعقيم SVG فعلي
   * (مثل DOMPurify بإعداد svg) قبل قبول أي قيمة جديدة — لا تنقل هذا الاستدعاء كما هو بدون
   * هذا التحقق إن تغيّر مصدر البيانات.
   */
  reassignSlot(libraryId: string, slot: string, newSvg: string): void {
    const libs = this.libraries().map(lib => {
      if (lib.id !== libraryId) return lib;
      return {
        ...lib,
        icons: lib.icons.map(ic => (ic.slot === slot ? { ...ic, svg: newSvg } : ic))
      };
    });
    this.libraries.set(libs);
  }

  /**
   * إضافة أيقونة جديدة كليًا لمكتبة (مو استبدال slot موجود) — كانت غايبة تمامًا قبل
   * 2026-08-18 (كل ما كان موجود هو reassignSlot الذي يستبدل شكل slot قائم فقط، ولا
   * يزيد عدد الأيقونات عن 168 المقفلة بالبناء). يتحقق أن الـslot فريد عبر كل المكتبات
   * (لأن accounts.ts يبحث بالـslot عبر كل المكتبات بلا تمييز مكتبة — تكرار slot = سلوك
   * عشوائي بحسب ترتيب المكتبات).
   */
  addIcon(libraryId: string, item: IconItem): { ok: true } | { ok: false; error: string } {
    const allSlots = this.libraries().flatMap(l => l.icons.map(i => i.slot));
    if (allSlots.includes(item.slot)) {
      return { ok: false, error: `الـslot "${item.slot}" مستخدم مسبقًا بمكتبة أخرى — لازم يكون فريدًا عبر كل المكتبات.` };
    }
    const libs = this.libraries().map(lib =>
      lib.id === libraryId ? { ...lib, icons: [...lib.icons, item] } : lib
    );
    this.libraries.set(libs);
    return { ok: true };
  }

  /** حذف أيقونة من مكتبة — كانت غايبة أيضًا (لا دالة حذف إطلاقًا قبل 2026-08-18) */
  removeIcon(libraryId: string, slot: string): void {
    const libs = this.libraries().map(lib =>
      lib.id === libraryId ? { ...lib, icons: lib.icons.filter(i => i.slot !== slot) } : lib
    );
    this.libraries.set(libs);
  }
}
