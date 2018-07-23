import {HomeComponent} from './components/home/home.component';
import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {InitComponent} from './components/init/init.component';
import {DevicesComponent} from './components/devices/devices.component';

const routes: Routes = [
  {
    path: '',
    component: InitComponent,
    children: [
      {
        path: '',
        component: DevicesComponent,
      },
      {
        path: 'home',
        component: HomeComponent,
      }
    ],
  },
  {path: '**', redirectTo: '/'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
