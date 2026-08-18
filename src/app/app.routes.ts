import { Routes } from '@angular/router';
import { ColorTokens } from './admin/color-tokens/color-tokens';
import { IconTokens } from './admin/icon-tokens/icon-tokens';
import { Accounts } from './admin/accounts/accounts';
import { Templates } from './admin/templates/templates';
import { ExportCss } from './admin/export-css/export-css';
import { Typography } from './admin/typography/typography';
import { Health } from './admin/health/health';
import { StyleGuide } from './admin/style-guide/style-guide';
import { LivePreview } from './admin/live-preview/live-preview';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/health', pathMatch: 'full' },
  { path: 'admin/tokens', component: ColorTokens },
  { path: 'admin/icons', component: IconTokens },
  { path: 'admin/accounts', component: Accounts },
  { path: 'admin/templates', component: Templates },
  { path: 'admin/export', component: ExportCss },
  { path: 'admin/typography', component: Typography },
  { path: 'admin/health', component: Health },
  { path: 'admin/style-guide', component: StyleGuide },
  { path: 'admin/live-preview', component: LivePreview }
];
