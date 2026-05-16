import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuComponent } from '../core/components/menu/menu.component';
import { IonicModule } from '@ionic/angular';
import { HeaderComponent } from '../core/components/header/header.component';



@NgModule({
  declarations: [MenuComponent, HeaderComponent],
  imports: [
    CommonModule,
    IonicModule
  ],
  exports: [MenuComponent, HeaderComponent]
})
export class SharedModule { }
