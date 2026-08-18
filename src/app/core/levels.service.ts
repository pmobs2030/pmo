import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { ThemeModeService } from './theme-mode.service';

export interface LevelItem {
    n: string;
    name: string;
    hex: string;
    rate?: string;
    cashback?: string;
    points?: number | null;
    proj?: number | null;
}

export interface AccountTypeLevels {
    id: string;
    label: string;
    rateLabel: string;
    levels: LevelItem[];
}

export interface LevelsFile {
    version: number;
    note: string;
    accountTypes: AccountTypeLevels[];
}

@Injectable({ providedIn: 'root' })
  export class LevelsService {
    private readonly themeMode = inject(ThemeModeService);
    private readonly darkTypes = signal<AccountTypeLevels[]>([]);
    private readonly lightTypes = signal<AccountTypeLevels[]>([]);
    readonly loadError = signal<string | null>(null);

  /** ألوان المستويات تختلف فعليًا بين الداكن والفاتح بالهوية (buildLevelColors(forLight)) —
     *  الأسماء والنسب/الكاش باك/النقاط مشتركة (نفس البيانات النصية/الرقمية بالوضعين). */
  readonly accountTypes = computed(() => (this.themeMode.mode() === 'dark' ? this.darkTypes() : this.lightTypes()));

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
        const [dark, light] = await Promise.all([
                firstValueFrom(this.http.get<LevelsFile>('assets/design-tokens/levels.json').pipe(catchError(() => of(null)))),
                firstValueFrom(this.http.get<LevelsFile>('assets/design-tokens/levels-light.json').pipe(catchError(() => of(null)))),
              ]);
        if (!dark || !light) {
                this.loadError.set('تعذّر تحميل ملفات المستويات (levels.json / levels-light.json).');
                return;
        }
        this.darkTypes.set(dark.accountTypes);
        this.lightTypes.set(light.accountTypes);
  }

  private targetSignal() {
        return this.themeMode.mode() === 'dark' ? this.darkTypes : this.lightTypes;
  }

  updateColor(typeId: string, levelN: string, hex: string): void {
        const target = this.targetSignal();
        const types = target().map(t => {
                if (t.id !== typeId) return t;
                return { ...t, levels: t.levels.map(l => (l.n === levelN ? { ...l, hex } : l)) };
        });
        target.set(types);
  }

  updateRate(typeId: string, levelN: string, value: string): void {
        const target = this.targetSignal();
        const types = target().map(t => {
                if (t.id !== typeId) return t;
                return {
                          ...t,
                          levels: t.levels.map(l => {
                                      if (l.n !== levelN) return l;
                                      if (l.cashback !== undefined) return { ...l, cashback: value };
                                      return { ...l, rate: value };
                          })
                };
        });
        target.set(types);
  }

  /** يحدّث عدد النقاط المطلوبة للمستوى (حقل points — طالب الخدمة فقط حاليًا) */
  updatePoints(typeId: string, levelN: string, value: number): void {
        const target = this.targetSignal();
        const types = target().map(t => {
                if (t.id !== typeId) return t;
                return { ...t, levels: t.levels.map(l => (l.n === levelN ? { ...l, points: value } : l)) };
        });
        target.set(types);
  }

  /** يحدّث الأرباح الإسقاطية التوضيحية للمستوى (حقل proj — طالب الخدمة فقط حاليًا) */
  updateProj(typeId: string, levelN: string, value: number): void {
        const target = this.targetSignal();
        const types = target().map(t => {
                if (t.id !== typeId) return t;
                return { ...t, levels: t.levels.map(l => (l.n === levelN ? { ...l, proj: value } : l)) };
        });
        target.set(types);
  }
}
