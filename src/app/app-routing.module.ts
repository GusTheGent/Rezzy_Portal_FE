import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RoutePath } from './shared/enums/routes.enum';

const routes: Routes = [
  {
    path: '',
    redirectTo: RoutePath.LOGIN,
    pathMatch: RoutePath.PATH_MATCH_FULL
  },
  {
    path: RoutePath.LOGIN,
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: RoutePath.HOME,
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
