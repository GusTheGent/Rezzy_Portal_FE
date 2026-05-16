import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FloorPlanPage } from './floor-plan.page';

const routes: Routes = [
  {
    path: '',
    component: FloorPlanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FloorPlanPageRoutingModule {}
