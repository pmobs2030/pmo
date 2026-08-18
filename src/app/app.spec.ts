import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render نافذة التنقل الرئيسية (nav) بكل الأقسام التسعة', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.admin-nav a');
    // إصلاح 2026-08-18: كان يتوقع 4 روابط (قيمة قديمة من قبل إعادة الهيكلة لـ3 تبويبات
    // ثم توسعة لاحقة)، بينما app.routes.ts الفعلي فيه 9 مسارات الآن (صحة النظام، القيم،
    // الأيقونات، الحسابات، القوالب، الخطوط، دليل الأنماط، معاينة شاملة، تصدير CSS).
    expect(links.length).toBe(9);
  });
});
