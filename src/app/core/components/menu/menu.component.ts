import { Component } from '@angular/core';
import { routeItems } from './helpers/routeItems';

@Component({
  selector: 'rezzy-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: false,
})
export class MenuComponent {
  public routeItems = routeItems;

}
