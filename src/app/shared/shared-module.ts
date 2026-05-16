import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '../core/components/menu/menu.component';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from '../core/components/header/header.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [MenuComponent, HeaderComponent],
  imports: [CommonModule, IonicModule, RouterModule],
  exports: [MenuComponent, HeaderComponent],
})
export class SharedModule {}
