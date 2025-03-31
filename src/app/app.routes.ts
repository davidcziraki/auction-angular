import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SearchComponent } from './components/search/search.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AuctionDetailComponent } from './components/auction-detail/auction-detail.component';
import { AccountManageComponent } from './components/auth/account-manage/account-manage.component';
import { GuideComponent } from './components/guide/guide.component';
import { AdminComponent } from './components/auth/admin/admin.component';
import { AngularFireAuthGuard } from '@angular/fire/compat/auth-guard';
import { hasCustomClaim } from '@angular/fire/auth-guard';
import { ContactComponent } from './components/contact/contact.component';
import { SellerHubComponent } from './components/seller-hub/seller-hub.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutSuccessComponent } from './components/checkout-success/checkout-success.component';

const adminOnly = () => hasCustomClaim('admin');

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  { path: 'home', component: HomeComponent },
  { path: 'search', component: SearchComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'seller-hub',
    component: SellerHubComponent,
    canActivate: [AngularFireAuthGuard],
  },

  { path: 'auction/:id', component: AuctionDetailComponent },
  {
    path: 'cart/:id',
    component: CartComponent,
    canActivate: [AngularFireAuthGuard],
  },
  { path: 'checkout-success', component: CheckoutSuccessComponent },

  {
    path: 'account',
    component: AccountManageComponent,
    canActivate: [AngularFireAuthGuard],
  },
  { path: 'guide', component: GuideComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AngularFireAuthGuard],
    data: { authGuardPipe: adminOnly },
  },
  { path: 'contact', component: ContactComponent },
];
