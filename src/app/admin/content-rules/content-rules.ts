import { Component, inject, OnInit } from '@angular/core';
import { ContentRulesService } from '../../core/content-rules.service';

@Component({
  selector: 'app-content-rules',
  standalone: true,
  imports: [],
  templateUrl: './content-rules.html',
  styleUrl: './content-rules.css'
})
export class ContentRules implements OnInit {
  rulesService = inject(ContentRulesService);

  async ngOnInit() {
    if (this.rulesService.approvedRules().length === 0) {
      await this.rulesService.load();
    }
  }

  onRuleChange(index: number, event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    this.rulesService.updateRule(index, value);
  }

  onGlossaryChange(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.rulesService.updateGlossaryValue(index, value);
  }
}
