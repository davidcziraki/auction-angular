import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchComponent } from './components/search/search.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AuctionDetailComponent } from './components/auction-detail/auction-detail.component';
import { AccountManageComponent } from './components/auth/account-manage/account-manage.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  { path: 'home', component: HomeComponent },
  { path: 'search', component: SearchComponent },
  { path: 'login', component: LoginComponent },
  { path: 'auction/:id', component: AuctionDetailComponent },
  { path: 'user-management', component: AccountManageComponent },
];
