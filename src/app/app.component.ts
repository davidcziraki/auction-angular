import { Component, inject, OnInit } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem, MessageService } from 'primeng/api';
import { NgIf } from '@angular/common';
import { getIdTokenResult, User } from '@angular/fire/auth';
import { AuthService } from './services/auth.service';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { FirestoreService } from './services/firestore.service';
import { UserModel } from './models/user';
import { AuctionService } from './services/auction.service';
import { Panel } from 'primeng/panel';
import { Toast } from 'primeng/toast';

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
    ReactiveFormsModule,
    Panel,
    Toast,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [MessageService],
})
export class AppComponent implements OnInit {
  loginForm!: FormGroup;
  registerForm!: FormGroup;

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
  authError = '';

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

  displayCookies = true;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private auctionService: AuctionService,
    private messageService: MessageService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    const aCollection = collection(this.firestore, 'items');
    this.items$ = collectionData(aCollection);
  }

  acceptCookies() {
    this.displayCookies = false;
    localStorage.setItem('cookieConsent', 'accepted');
  }

  rejectCookies() {
    this.displayCookies = false;
    localStorage.setItem('cookieConsent', 'rejected');
  }

  showDialog() {
    this.displayDialog = true;
  }

  toggleForm() {
    this.isRegistering = !this.isRegistering;
  }

  ngOnInit() {
    const consent = localStorage.getItem('cookieConsent');
    this.displayCookies = consent === null; // Only show if no choice has been made

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

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)],
      ],
      lastName: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)],
      ],

      dob: ['', Validators.required],
      password: [
        '',
        [Validators.required, Validators.minLength(6), passwordValidator()],
      ],
    });
  }

  setMenuItems() {
    this.menuItems = [
      { label: 'Home', icon: 'pi pi-fw pi-home', routerLink: '/home' },
      { label: 'Auctions', icon: 'pi pi-fw pi-search', routerLink: '/search' },
      { label: 'Guide', icon: 'pi pi-fw pi-info-circle', routerLink: '/guide' },
      {
        label: 'Contact',
        icon: 'pi pi-fw pi-envelope',
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
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    this.authService
      .loginUser(email, password, this.rememberMe)
      .then(() => {
        this.displayDialog = false;
      })
      .catch((error) => {
        console.error('Login error:', error);

        const errorMessage = error?.message || '';

        if (errorMessage.includes('auth/user-not-found')) {
          this.authError = 'No user found with this email.';
        } else if (errorMessage.includes('auth/invalid-credential')) {
          this.authError = 'Incorrect password.';
        } else if (errorMessage.includes('auth/invalid-email')) {
          this.authError = 'Invalid email format.';
        } else {
          this.authError = 'Login failed. Please try again.';
        }
      });
  }

  register() {
    this.authError = '';
    let newUser: UserModel;

    if (this.registerForm.invalid) return;

    const { email, firstName, lastName, dob, password } =
      this.registerForm.value;

    this.authService
      .createUser(email, password)
      .then((user) => {
        if (!user) {
          console.error('User creation failed');
          return null;
        }

        newUser = {
          forename: firstName,
          surname: lastName,
          DOB: new Date(dob),
          email,
          userID: user.uid,
          admin: false,
        };

        return this.authService.loginUser(email, password, true);
      })
      .then(() => this.firestoreService.addUser(newUser))
      .then(() => {
        this.userFirestore = newUser;
        this.displayDialog = false;
        this.messageService.add({
          severity: 'info',
          summary: 'Registration Successful',
          detail:
            'A confirmation email has been sent to your email address. Please check your inbox and verify your email to complete registration.',
          key: 'br',
          sticky: true,
        });
      })

      .catch((error) => {
        if (error.code === 'auth/email-already-in-use') {
          this.authError = 'This email address is already in use.';
        } else {
          this.authError = 'Registration failed. Please try again.';
          console.error(error);
        }
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
    const email = this.loginForm.get('email')?.value;

    if (!email) {
      alert('Please enter your email first.');
      return;
    }

    try {
      await this.authService.sendPasswordReset(email);
      alert('Password reset email sent. Please check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Failed to send reset email. Please try again.');
    }
  }
}

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.value;
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$/;
    return pattern.test(password)
      ? null
      : {
          invalidPassword:
            'Password must be at least 6 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.',
        };
  };
}
