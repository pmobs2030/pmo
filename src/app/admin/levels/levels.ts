import { Component, inject, OnInit } from '@angular/core';
import { LevelsService } from '../../core/levels.service';
import { PerksService } from '../../core/perks.service';

@Component({
  selector: 'app-levels',
  standalone: true,
  imports: [],
  templateUrl: './levels.html',
  styleUrl: './levels.css'
})
export class Levels implements OnInit {
  levelsService = inject(LevelsService);
  perksService = inject(PerksService);

  async ngOnInit() {
    if (this.levelsService.accountTypes().length === 0) {
      await this.levelsService.load();
    }
    if (this.perksService.accountTypes().length === 0) {
      await this.perksService.load();
    }
  }

  onColorChange(typeId: string, levelN: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.levelsService.updateColor(typeId, levelN, value);
  }

  onRateChange(typeId: string, levelN: string, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    const n = parseFloat(raw);
    this.levelsService.updateRate(typeId, levelN, `${Number.isFinite(n) ? n : 0}%`);
  }

  onPointsChange(typeId: string, levelN: string, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    this.levelsService.updatePoints(typeId, levelN, parseFloat(raw) || 0);
  }

  onProjChange(typeId: string, levelN: string, event: Event) {
    const raw = (event.target as HTMLInputElement).value;
    this.levelsService.updateProj(typeId, levelN, parseFloat(raw) || 0);
  }

  onPerkChange(typeId: string, bandIndex: number, itemIndex: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.perksService.updateItem(typeId, bandIndex, itemIndex, value);
  }

  addPerk(typeId: string, bandIndex: number) {
    this.perksService.addItem(typeId, bandIndex);
  }

  removePerk(typeId: string, bandIndex: number, itemIndex: number) {
    this.perksService.removeItem(typeId, bandIndex, itemIndex);
  }

  rateAsNumber(value: string | undefined): number {
    if (!value) return 0;
    return parseFloat(value.replace('%', '')) || 0;
  }

  perksFor(typeId: string) {
    return this.perksService.accountTypes().find(t => t.id === typeId);
  }
}
