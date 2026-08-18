import { Routes } from '@angular/router';
import { ColorTokens } from './admin/color-tokens/color-tokens';
import { IconTokens } from './admin/icon-tokens/icon-tokens';
import { Levels } from './admin/levels/levels';
import { ExportCss } from './admin/export-css/export-css';
import { ContentRules } from './admin/content-rules/content-rules';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/tokens', pathMatch: 'full' },
  { path: 'admin/tokens', component: ColorTokens },
  { path: 'admin/icons', component: IconTokens },
  { path: 'admin/levels', component: Levels },
  { path: 'admin/rules', component: ContentRules },
  { path: 'admin/export', component: ExportCss }
];
