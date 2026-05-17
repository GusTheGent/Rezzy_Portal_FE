import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private renderer: Renderer2;
  public currentTheme: 'light' | 'dark' = 'light';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.loadSavedTheme();
  }

  private loadSavedTheme() {
    const saved = localStorage.getItem('rezzy-global-theme');
    this.currentTheme = saved === 'dark' ? 'dark' : 'light';
    this.applyThemeToDocument();
  }

  public toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('rezzy-global-theme', this.currentTheme);
    this.applyThemeToDocument();
  }

  private applyThemeToDocument() {
    this.renderer.setAttribute(
      document.documentElement,
      'data-app-theme',
      this.currentTheme
    );
  }
}
