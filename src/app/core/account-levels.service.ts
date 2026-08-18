import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';

export interface AccountLevel {
  level: number;
  name: string;
  requirements: Record<string, number>;
  commission?: number;
  netIncomeShare?: number;
  cashback?: number;
  monthlySalary?: number;
  baseSalary?: number;
  bonusUSD?: number;
  profitShare?: number;
  loyaltyMonthlyValue?: number;
  icon?: string;
  hexDark: string;
  hexLight: string;
}

export interface PointsRule {
  activity?: string;
  violation?: string;
  points: number;
  condition: string;
  frequency: string;
}

export interface AdjustmentFactor {
  factor: string;
  effect?: number;
  multiplier?: number;
}

export interface AccountType {
  id: string;
  label: string;
  icon: string;
  levels: AccountLevel[];
  pointsEarn: PointsRule[];
  pointsLose: PointsRule[];
  commissionAdjustmentFactors?: AdjustmentFactor[];
  cashbackAdjustmentFactors?: AdjustmentFactor[];
  ambassadorProgram: { condition: string };
  monthlyAward: { condition: string };
  annualAward: { condition: string };
}

export interface AccountLevelsFile {
  version: number;
  note: string;
  generalViolations: PointsRule[];
  partnersProgram: { label: string; conditions: { item: string; value: string }[] };
  accounts: AccountType[];
}

@Injectable({ providedIn: 'root' })
export class AccountLevelsService {
  readonly data = signal<AccountLevelsFile | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly groupIcons = signal<Record<string, string>>({});
  readonly levelIcons = signal<Record<string, string>>({});

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<AccountLevelsFile>('assets/design-tokens/account-levels.json').pipe(catchError(() => of(null)))
    );
    if (!res) {
      this.loadError.set('تعذّر تحميل ملف بيانات الحسابات (account-levels.json).');
      return;
    }
    this.data.set(res);
  }

  accountsList(): AccountType[] {
    return this.data()?.accounts ?? [];
  }

  private updateAccount(accountId: string, fn: (a: AccountType) => AccountType) {
    const d = this.data();
    if (!d) return;
    this.data.set({ ...d, accounts: d.accounts.map(a => (a.id === accountId ? fn(a) : a)) });
  }

  private updateLevel(accountId: string, levelN: number, fn: (l: AccountLevel) => AccountLevel) {
    this.updateAccount(accountId, a => ({
      ...a,
      levels: a.levels.map(l => (l.level === levelN ? fn(l) : l))
    }));
  }

  updateLevelField(accountId: string, levelN: number, field: keyof AccountLevel, value: number) {
    this.updateLevel(accountId, levelN, l => ({ ...l, [field]: value }));
  }

  updateLevelRequirement(accountId: string, levelN: number, reqKey: string, value: number) {
    this.updateLevel(accountId, levelN, l => ({ ...l, requirements: { ...l.requirements, [reqKey]: value } }));
  }

  updateLevelName(accountId: string, levelN: number, name: string) {
    this.updateLevel(accountId, levelN, l => ({ ...l, name }));
  }

  updateLevelHex(accountId: string, levelN: number, mode: 'hexDark' | 'hexLight', hex: string) {
    this.updateLevel(accountId, levelN, l => ({ ...l, [mode]: hex }));
  }

  updatePointsRule(accountId: string, listKey: 'pointsEarn' | 'pointsLose', index: number, field: keyof PointsRule, value: string | number) {
    this.updateAccount(accountId, a => {
      const list = [...a[listKey]];
      list[index] = { ...list[index], [field]: value } as PointsRule;
      return { ...a, [listKey]: list };
    });
  }

  setGroupIcon(accountId: string, svg: string) {
    this.groupIcons.update(m => ({ ...m, [accountId]: svg }));
  }

  clearGroupIcon(accountId: string) {
    this.groupIcons.update(m => {
      const { [accountId]: _, ...rest } = m;
      return rest;
    });
  }

  setLevelIcon(accountId: string, levelN: number, svg: string) {
    this.levelIcons.update(m => ({ ...m, [`${accountId}:${levelN}`]: svg }));
  }

  clearLevelIcon(accountId: string, levelN: number) {
    this.levelIcons.update(m => {
      const key = `${accountId}:${levelN}`;
      const { [key]: _, ...rest } = m;
      return rest;
    });
  }

  levelIconFor(accountId: string, levelN: number): string | null {
    return this.levelIcons()[`${accountId}:${levelN}`] ?? this.groupIcons()[accountId] ?? null;
  }
}
