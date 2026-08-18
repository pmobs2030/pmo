import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<IconsFile>('assets/design-tokens/icons.json').pipe(catchError(() => of(null)))
    );
    if (!data) {
      this.loadError.set('تعذّر تحميل ملف الأيقونات (icons.json).');
      return;
    }
    this.libraries.set(data.libraries);
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
}
