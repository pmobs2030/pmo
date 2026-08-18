import { Routes } from '@angular/router';
import { ColorTokens } from './admin/color-tokens/color-tokens';
import { IconTokens } from './admin/icon-tokens/icon-tokens';
import { Accounts } from './admin/accounts/accounts';
import { Templates } from './admin/templates/templates';
import { ExportCss } from './admin/export-css/export-css';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/tokens', pathMatch: 'full' },
  { path: 'admin/tokens', component: ColorTokens },
  { path: 'admin/icons', component: IconTokens },
  { path: 'admin/accounts', component: Accounts },
  { path: 'admin/templates', component: Templates },
  { path: 'admin/export', component: ExportCss }
];
