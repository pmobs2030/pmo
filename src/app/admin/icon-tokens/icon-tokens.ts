import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconsService } from '../../core/icons.service';
import { readAndSanitizeSvgFile } from '../../core/svg-sanitize';

@Component({
  selector: 'app-icon-tokens',
  standalone: true,
  imports: [],
  templateUrl: './icon-tokens.html',
  styleUrl: './icon-tokens.css'
})
export class IconTokens implements OnInit {
  iconsService = inject(IconsService);
  private sanitizer = inject(DomSanitizer);

  activeLibId = signal<string>('');
  uploadError = signal<Record<string, string>>({});
  savedMsg = signal<string>('');

  readonly activeLib = computed(() => {
    const libs = this.iconsService.libraries();
    const id = this.activeLibId();
    return libs.find(l => l.id === id) ?? libs[0] ?? null;
  });

  async ngOnInit() {
    if (this.iconsService.libraries().length === 0) {
      await this.iconsService.load();
    }
  }

  selectLib(id: string) {
    this.activeLibId.set(id);
  }

  safeSvg(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  /** يُستدعى بـslot الأيقونة المختارة (مو محتوى SVG الخام) — يتفادى مشكلة تكرار قيم select
   *  المحتملة لو تشابه شكلا أيقونتين حرفيًا مستقبلاً (ملاحظة تدقيق الكود). */
  onReassign(libraryId: string, slot: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const chosenSlot = select.value;
    const lib = this.iconsService.libraries().find(l => l.id === libraryId);
    const chosen = lib?.icons.find(ic => ic.slot === chosenSlot);
    if (chosen) {
      this.iconsService.reassignSlot(libraryId, slot, chosen.svg);
    }
  }

  save() {
    const ok = this.iconsService.save();
    this.savedMsg.set(ok ? 'تم الحفظ محليًا' : 'تعذّر الحفظ');
    setTimeout(() => this.savedMsg.set(''), 4000);
  }

  exportJson() {
    this.iconsService.exportJson();
  }

  async onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const res = await this.iconsService.importJson(file);
    // إصلاح 2026-08-19: res.error قد يُرفَق مع ok:true الآن (تحذير عدد الأيقونات المرفوضة
    // أمنيًا أثناء التعقيم) — يجب عرضه دائمًا إن وُجد، وليس فقط عند ok:false.
    this.savedMsg.set(res.error ?? (res.ok ? 'تم الاستيراد' : 'فشل الاستيراد'));
    setTimeout(() => this.savedMsg.set(''), 4000);
  }

  async onUploadIcon(libraryId: string, slot: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const key = `${libraryId}:${slot}`;
    const result = await readAndSanitizeSvgFile(file);
    this.uploadError.update(m => {
      const { [key]: _, ...rest } = m;
      if (!result.ok) return { ...rest, [key]: result.error };
      this.iconsService.reassignSlot(libraryId, slot, result.svg);
      return rest;
    });
  }
}
