import { Component } from '@angular/core';
import { ThemeService } from 'src/app/shared/services/theme.service';

@Component({
  selector: 'rezzy-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage {

  public userProfile = {
    displayName: 'Manager Account',
    email: 'admin@rezzy.com',
    notificationsEnabled: true,
    syncInterval: '30'
  };

  constructor(public themeService: ThemeService) { }


  public handleThemeChange(event: any) {
    const isDarkChecked = event.detail.checked;
    const currentMode = this.themeService.currentTheme;

    if ((isDarkChecked && currentMode === 'light') || (!isDarkChecked && currentMode === 'dark')) {
      this.themeService.toggleTheme();
    }
  }

  public saveProfileChanges() {
    console.log('Saving profile properties to backend...', this.userProfile);
  }

  public resetLocalLayoutCache() {
    console.log('Resetting local layout structure cache.');
  }
}
