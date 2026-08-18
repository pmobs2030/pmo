import { Component, inject, OnInit, signal } from '@angular/core';
import { DesignTokensService } from '../../core/design-tokens.service';

@Component({
  selector: 'app-export-css',
  standalone: true,
  imports: [],
  templateUrl: './export-css.html',
  styleUrl: './export-css.css'
})
export class ExportCss implements OnInit {
  tokensService = inject(DesignTokensService);
  cssText = signal('');
  copied = signal(false);

  async ngOnInit() {
    if (!this.tokensService.loaded()) {
      await this.tokensService.loadAndApply();
    }
    this.refresh();
  }

  refresh(): void {
    this.cssText.set(this.tokensService.generateCssText());
    this.copied.set(false);
  }

  async copy(): Promise<void> {
    await this.tokensService.copyCssToClipboard();
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  download(): void {
    this.tokensService.downloadCss();
  }
}
