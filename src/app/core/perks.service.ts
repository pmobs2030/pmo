import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';

export interface PerkBand {
  band: string;
  items: string[];
}

export interface PerkAccountType {
  id: string;
  label: string;
  bands: PerkBand[];
}

export interface PerksFile {
  version: number;
  note: string;
  accountTypes: PerkAccountType[];
}

@Injectable({ providedIn: 'root' })
export class PerksService {
  readonly accountTypes = signal<PerkAccountType[]>([]);
  readonly loadError = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<PerksFile>('assets/design-tokens/levels-perks.json').pipe(catchError(() => of(null)))
    );
    if (!data) {
      this.loadError.set('تعذّر تحميل ملف مزايا المستويات.');
      return;
    }
    this.accountTypes.set(data.accountTypes);
  }

  updateItem(typeId: string, bandIndex: number, itemIndex: number, value: string): void {
    const types = this.accountTypes().map(t => {
      if (t.id !== typeId) return t;
      return {
        ...t,
        bands: t.bands.map((b, bi) =>
          bi !== bandIndex ? b : { ...b, items: b.items.map((it, ii) => (ii === itemIndex ? value : it)) }
        ),
      };
    });
    this.accountTypes.set(types);
  }

  addItem(typeId: string, bandIndex: number): void {
    const types = this.accountTypes().map(t => {
      if (t.id !== typeId) return t;
      return {
        ...t,
        bands: t.bands.map((b, bi) => (bi !== bandIndex ? b : { ...b, items: [...b.items, 'ميزة جديدة'] })),
      };
    });
    this.accountTypes.set(types);
  }

  removeItem(typeId: string, bandIndex: number, itemIndex: number): void {
    const types = this.accountTypes().map(t => {
      if (t.id !== typeId) return t;
      return {
        ...t,
        bands: t.bands.map((b, bi) => (bi !== bandIndex ? b : { ...b, items: b.items.filter((_, ii) => ii !== itemIndex) })),
      };
    });
    this.accountTypes.set(types);
  }
}
