import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppComponent } from './app.component';

// Stub child components to avoid pulling in their dependencies
@Component({ selector: 'app-offline-banner', standalone: true, template: '' })
class OfflineBannerStub {}

@Component({ selector: 'app-session-expiry-warning', standalone: true, template: '' })
class SessionExpiryWarningStub {}

@Component({ selector: 'app-error-toast', standalone: true, template: '' })
class ErrorToastStub {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    })
      .overrideComponent(AppComponent, {
        set: {
          imports: [RouterOutlet, OfflineBannerStub, SessionExpiryWarningStub, ErrorToastStub],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have title "VIN Portal"', () => {
    expect(component.title).toBe('VIN Portal');
  });

  it('should render <router-outlet>', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render <main id="main-content">', () => {
    const el = fixture.nativeElement as HTMLElement;
    const main = el.querySelector('main#main-content');
    expect(main).toBeTruthy();
  });

  it('should render child components', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-offline-banner')).toBeTruthy();
    expect(el.querySelector('app-session-expiry-warning')).toBeTruthy();
    expect(el.querySelector('app-error-toast')).toBeTruthy();
  });
});
