import { Component, inject, OnInit } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { NgIf } from '@angular/common';
import { User } from '@angular/fire/auth';
import { AuthService } from './services/auth.service';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { FirestoreService } from './services/firestore.service';
import { UserModel } from './models/user';
import { AuctionService } from './services/auction.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MegaMenuModule,
    MenubarModule,
    NgIf,
    Avatar,
    Menu,
    Dialog,
    Checkbox,
    FormsModule,
    InputText,
    ButtonDirective,
    Ripple,
    RouterLink,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'finalyear';
  menuItems: MenuItem[] | undefined;
  authState$!: Observable<User | null>;
  user: User | null = null;
  bannerVisible = true;

  // Dialog state
  displayDialog: boolean = false;
  isRegistering: boolean = false;

  // Form fields
  emaiLogin: string = '';
  passwordLogin: string = '';
  emailRegister: string = '';
  passwordRegister: string = '';
  firstName: string = '';
  lastName: string = '';
  dob: string = '';

  userMenu: MenuItem[] = [];
  firestore: Firestore = inject(Firestore);
  items$: Observable<any[]>;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private auctionService: AuctionService,
  ) {
    const aCollection = collection(this.firestore, 'items');
    this.items$ = collectionData(aCollection);
  }

  showDialog() {
    this.displayDialog = true;
  }

  toggleForm() {
    this.isRegistering = !this.isRegistering;
  }

  ngOnInit() {
    this.auctionService.checkAuctionsPeriodically();

    this.authState$ = this.authService.authState$;

    this.authState$.subscribe((user) => {
      this.user = user;
      this.updateUserMenu();
    });

    this.menuItems = [
      {
        label: 'Home',
        icon: 'pi pi-fw pi-home',
        routerLink: '/home',
      },
      {
        label: 'Guide',
        icon: 'pi pi-fw pi-info-circle',
        routerLink: '/guide',
      },
      {
        label: 'Auctions',
        icon: 'pi pi-fw pi-search',
        routerLink: '/search',
      },
      {
        label: 'Account',
        icon: 'pi pi-fw pi-warehouse',
        routerLink: 'user-management',
      },
      {
        label: 'Contact',
        icon: 'pi pi-fw pi-address-book',
        routerLink: '',
      },
      {
        label: 'Admin Panel',
        icon: 'pi pi-fw pi-shield',
        routerLink: 'admin',
      },
    ];
  }

  updateUserMenu() {
    this.userMenu = [
      {
        label: this.user ? 'Logout' : 'Login',
        icon: this.user ? 'pi pi-sign-out' : 'pi pi-sign-in',
        command: () => (this.user ? this.logout() : this.showDialog()),
      },
    ];
  }

  login() {
    this.authService
      .loginUser(this.emaiLogin, this.passwordLogin)
      .then((user) => {
        console.log('Login successful:', user);
        this.displayDialog = false;
      })
      .catch((error) => {
        console.error('Login error:', error);
      });
  }

  register() {
    this.authService
      .createUser(this.emailRegister, this.passwordRegister)
      .then((user) => {
        const newUser: UserModel = {
          forename: this.firstName,
          surname: this.lastName,
          DOB: new Date(this.dob),
          email: this.emailRegister,
          userID: user.uid,
          admin: false,
        };

        this.firestoreService
          .addUser(newUser)
          .then(() => {
            console.log('User registered successfully.');
            this.displayDialog = false;
          })
          .catch((error) => {
            console.error('Error adding user:', error);
          });
      })
      .catch((error) => {
        console.error('Registration error:', error);
      });
  }

  logout() {
    this.authService
      .logout()
      .then(() => {
        this.user = null;
      })
      .catch((error) => {
        console.error('Logout error:', error);
      });
  }

  closeBanner() {
    this.bannerVisible = false;
  }

  trackByName(index: number, item: any): number {
    return item.name;
  }
}
