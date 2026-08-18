import { Component, inject, OnInit } from '@angular/core';
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

  async ngOnInit() {
    if (this.iconsService.libraries().length === 0) {
      await this.iconsService.load();
    }
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
}
