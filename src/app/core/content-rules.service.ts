import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';

export interface GlossaryTerm {
  rule: string;
  value: string;
}

export interface ContentRulesFile {
  version: number;
  note: string;
  approvedRules: string[];
  glossaryTerms: GlossaryTerm[];
}

@Injectable({ providedIn: 'root' })
export class ContentRulesService {
  readonly approvedRules = signal<string[]>([]);
  readonly glossaryTerms = signal<GlossaryTerm[]>([]);
  readonly loadError = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<ContentRulesFile>('assets/design-tokens/content-rules.json').pipe(catchError(() => of(null)))
    );
    if (!data) {
      this.loadError.set('تعذّر تحميل ملف القواعد والمصطلحات.');
      return;
    }
    this.approvedRules.set(data.approvedRules);
    this.glossaryTerms.set(data.glossaryTerms);
  }

  updateRule(index: number, value: string): void {
    this.approvedRules.set(this.approvedRules().map((r, i) => (i === index ? value : r)));
  }

  updateGlossaryValue(index: number, value: string): void {
    this.glossaryTerms.set(this.glossaryTerms().map((g, i) => (i === index ? { ...g, value } : g)));
  }
}
