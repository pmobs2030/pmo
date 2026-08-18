import { Component, OnInit, inject, signal } from '@angular/core';
import { TypographyService } from '../../core/typography.service';
import { ThemeModeService } from '../../core/theme-mode.service';

type SubTab = 'families' | 'roles' | 'scale';

@Component({
  selector: 'app-typography',
  standalone: true,
  imports: [],
  templateUrl: './typography.html',
  styleUrl: './typography.css'
})
export class Typography implements OnInit {
  service = inject(TypographyService);
  themeMode = inject(ThemeModeService);

  activeTab = signal<SubTab>('roles');
  savedMsg = signal<string>('');

  readonly previewText = 'وسيط AI — سوق خدمات موثوق يجمع مقدّم الخدمة وطالبها والوسيط بضمان مالي كامل';

  async ngOnInit() {
    if (this.service.roles().length === 0) {
      await this.service.load();
    }
  }

  selectTab(t: SubTab) {
    this.activeTab.set(t);
  }

  /** الأدوار مرتّبة تنازليًا حسب الحجم — لكشف التطابقات (مثال معروف: h5 وbody-md كلاهما 14px) */
  sortedRolesBySize() {
    const toNum = (v: string) => parseFloat(v);
    return [...this.service.roles()].sort((a, b) => toNum(b.fontSize) - toNum(a.fontSize));
  }

  duplicateSizeIds(): Set<string> {
    const bySize = new Map<string, string[]>();
    for (const r of this.service.roles()) {
      bySize.set(r.fontSize, [...(bySize.get(r.fontSize) ?? []), r.id]);
    }
    const dupes = new Set<string>();
    for (const ids of bySize.values()) {
      if (ids.length > 1) ids.forEach(id => dupes.add(id));
    }
    return dupes;
  }

  onFamilyChange(familyId: string, event: Event) {
    this.service.updateFamilyValue(familyId, (event.target as HTMLInputElement).value);
  }

  onRoleFamilyRef(roleId: string, event: Event) {
    this.service.updateRoleFamily(roleId, (event.target as HTMLSelectElement).value);
  }

  onRoleField(roleId: string, field: 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing', event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.service.updateRoleField(roleId, field, value);
  }

  async save() {
    const ok = this.service.save();
    this.savedMsg.set(ok ? 'تم الحفظ محليًا' : 'تعذّر الحفظ');
    setTimeout(() => this.savedMsg.set(''), 4000);
  }

  exportJson() {
    this.service.exportJson();
  }

  async onImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const res = await this.service.importJson(file);
    this.savedMsg.set(res.ok ? 'تم الاستيراد' : (res.error ?? 'فشل الاستيراد'));
    setTimeout(() => this.savedMsg.set(''), 4000);
  }

  async resetToSource() {
    if (!confirm('هذا سيمسح كل تعديلاتك المحفوظة محليًا للخطوط ويرجّع القيم الأصلية — متأكد؟')) return;
    await this.service.resetToSource();
  }
}
