import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconsService } from '../../core/icons.service';

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

  async onUploadIcon(libraryId: string, slot: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const key = `${libraryId}:${slot}`;
    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      this.uploadError.update(m => ({ ...m, [key]: 'الملف يجب أن يكون SVG فقط.' }));
      return;
    }
    const text = await file.text();
    const ok = this.iconsService.uploadSlotSvg(libraryId, slot, text);
    this.uploadError.update(m => {
      const { [key]: _, ...rest } = m;
      return ok ? rest : { ...rest, [key]: 'تعذّر قبول الملف (فشل التعقيم الأمني للـSVG).' };
    });
  }
}
