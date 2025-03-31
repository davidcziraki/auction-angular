import { Component, inject, OnInit } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { NgIf } from '@angular/common';
import { getIdTokenResult, User } from '@angular/fire/auth';
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
  userFirestore: UserModel | null = null;
  bannerVisible = true;
  isLoggedIn: boolean = false;
  isAdmin$ = new BehaviorSubject<boolean>(false); // Store admin status
  rememberMe: boolean = false;

  // Dialog state
  displayDialog: boolean = false;
  isRegistering: boolean = false;
  passwordError = '';

  // Form fields
  emailLogin: string = '';
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
    private router: Router,
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

    this.authState$.subscribe(async (user) => {
      this.user = user;
      this.isLoggedIn = !!user;

      if (user?.email) {
        this.userFirestore = await this.firestoreService.getUserDetailsByEmail(
          user.email,
        );
      } else {
        this.userFirestore = null;
      }

      this.isAdmin$.next(
        user ? !!(await getIdTokenResult(user)).claims['admin'] : false,
      );

      this.setMenuItems();
      this.updateUserMenu();
    });
  }

  setMenuItems() {
    this.menuItems = [
      { label: 'Home', icon: 'pi pi-fw pi-home', routerLink: '/home' },
      { label: 'Auctions', icon: 'pi pi-fw pi-search', routerLink: '/search' },
      { label: 'Guide', icon: 'pi pi-fw pi-info-circle', routerLink: '/guide' },
      {
        label: 'Contact',
        icon: 'pi pi-fw pi-address-book',
        routerLink: 'contact',
      },
      ...(this.isAdmin$.value
        ? [
            {
              label: 'Admin Panel',
              icon: 'pi pi-fw pi-shield',
              routerLink: 'admin',
            },
          ]
        : []),
      {
        label: 'Seller Hub',
        icon: 'pi pi-fw pi-briefcase',
        routerLink: '/seller-hub',
        command: () => {
          if (this.isLoggedIn) {
            this.router.navigate(['/seller-hub']);
          } else {
            this.showDialog(); // Open login modal
          }
        },
      },
    ];
  }

  updateUserMenu() {
    this.userMenu = [
      ...(this.user
        ? [
            {
              label: 'Account',
              icon: 'pi pi-fw pi-user',
              command: () => {
                if (this.isLoggedIn) {
                  this.router.navigate(['/account']);
                }
              },
            },
          ]
        : []),
      {
        label: this.user ? 'Logout' : 'Login',
        icon: this.user ? 'pi pi-sign-out' : 'pi pi-sign-in',
        command: () => (this.user ? this.logout() : this.showDialog()),
      },
    ];
  }

  login() {
    this.authService
      .loginUser(this.emailLogin, this.passwordLogin, this.rememberMe)
      .then((user) => {
        this.displayDialog = false;
      })
      .catch((error) => {
        console.error('Login error:', error);
      });
  }

  register() {
    this.passwordError = '';

    // Validate password strength
    if (!this.validatePassword(this.passwordRegister)) {
      this.passwordError =
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character, and be at least 6 characters long.';
      return;
    }

    this.authService
      .createUser(this.emailRegister, this.passwordRegister)
      .then((user) => {
        if (!user) {
          console.error('User creation failed');
          return;
        }

        // Ensure user is signed in before adding to Firestore
        return this.authService
          .loginUser(this.emailRegister, this.passwordRegister, true)
          .then(() => user);
      })
      .then((user) => {
        if (!user) return;

        const newUser: UserModel = {
          forename: this.firstName,
          surname: this.lastName,
          DOB: new Date(this.dob),
          email: this.emailRegister,
          userID: user.uid, // Use Firebase UID
          admin: false,
        };

        return this.firestoreService.addUser(newUser);
      })
      .then(() => {
        console.log('User registered and added to Firestore successfully.');
        this.displayDialog = false;
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
        this.userFirestore = null;
      })
      .catch((error) => {
        console.error('Logout error:', error);
      });
  }

  closeBanner() {
    this.bannerVisible = false;
  }

  async forgotPassword() {
    if (!this.emailLogin) {
      alert('Please enter your email first.');
      return;
    }

    try {
      await this.authService.sendPasswordReset(this.emailLogin);
      alert('Password reset email sent. Please check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send reset email. Please try again.');
    }
  }

  validatePassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return regex.test(password);
  }
}
