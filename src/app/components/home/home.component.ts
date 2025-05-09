import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DecimalPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { Auction } from '../../models/auction';
import { getAuth, User } from '@angular/fire/auth';
import { MessageService } from 'primeng/api';
import { FirestoreService } from '../../services/firestore.service';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Skeleton } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { UserModel } from '../../models/user';
import { passwordValidator } from '../../app.component';

@Component({
  selector: 'app-home',
  imports: [
    ButtonModule,
    Ripple,
    RouterLink,
    FormsModule,
    NgForOf,
    NgIf,
    NgClass,
    Skeleton,
    DecimalPipe,
    Toast,
    Checkbox,
    Dialog,
    InputText,
    ReactiveFormsModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [MessageService],
})
export class HomeComponent {
  searchInput: string = '';
  auctions: Auction[] = [];
  authState$!: Observable<User | null>;
  user: User | null = null;
  loadedImages: Set<string> = new Set();
  displayMode: string = '';
  isLoading: boolean = true;
  skeletonArray = new Array(6);
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
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  authError = '';
  userFirestore: UserModel | null = null;
  scrollOffset = 0;
  private countdownInterval?: number;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.authState$ = this.authService.authState$;
    this.authState$.subscribe(async (user) => {
      this.user = user;
      await this.loadAuctions(user?.uid); // Ensure auctions are loaded first
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

  validatePassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return regex.test(password);
  }

  showDialog() {
    this.displayDialog = true;
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

  toggleForm() {
    this.isRegistering = !this.isRegistering;
  }

  sendToSellerHub() {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      this.router.navigate(['/seller-hub']);
    } else {
      this.displayDialog = true;
    }
  }

  async loadAuctions(userId?: string) {
    try {
      this.isLoading = true;

      // Fetch all auctions with additional data
      const allAuctions = await this.firestoreService.getAuctions(userId);

      // Filter out auctions that are not active
      const activeAuctions = allAuctions.filter(
        (a) => a.status?.toLowerCase() === 'active',
      );

      // Separate active auctions into different categories
      const favoriteAuctions = activeAuctions.filter((a) => a.isFavourite);
      const popularOrEndingSoonAuctions = activeAuctions.filter(
        (a) => a.isPopular || a.isEndingSoon,
      );

      // Determine which auctions to display
      if (favoriteAuctions.length > 0) {
        this.auctions = favoriteAuctions.slice(0, 6);
        this.displayMode = 'favorites';
      } else if (popularOrEndingSoonAuctions.length > 0) {
        this.auctions = popularOrEndingSoonAuctions.slice(0, 6);
        this.displayMode = 'trending';
      } else {
        // Show a random selection if no favorites or popular/ending soon auctions
        this.auctions = activeAuctions.slice(0, 6);
        this.displayMode = 'random';
      }

      // Start countdown timers
      this.startGlobalCountdown();
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  submitSearch() {
    if (this.searchInput.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchInput.trim() },
      });
    }
  }

  /** Add or remove auction from favourites */
  async toggleFavourite(auction: Auction | null) {
    if (!auction) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Auction is null.',
      });
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user?.uid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not logged in.',
      });
      return;
    }

    try {
      await this.firestoreService.toggleFavourites(user.uid, auction.id!);
      auction.isFavourite = !auction.isFavourite;

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: auction.isFavourite
          ? 'Added to favourites'
          : 'Removed from favourites',
      });
    } catch (error) {
      console.error('Error toggling favourite:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update favourites.',
      });
    }
  }

  private startGlobalCountdown() {
    // Initial update
    this.updateAllCountdowns();

    // Single interval for all auctions
    this.countdownInterval = window.setInterval(() => {
      this.updateAllCountdowns();
    }, 1000);
  }

  private updateAllCountdowns() {
    const now = Date.now(); // Get current timestamp once

    this.auctions.forEach((auction) => {
      const timeLeft = auction.endTimeDate.getTime() - now;

      if (timeLeft <= 0) {
        auction['countdown'] = 'Auction Ended';
        return;
      }

      // More efficient time calculations using division and modulo
      const days = Math.floor(timeLeft / 86400000); // 1000 * 60 * 60 * 24
      const hours = Math.floor((timeLeft % 86400000) / 3600000); // 1000 * 60 * 60
      const minutes = Math.floor((timeLeft % 3600000) / 60000); // 1000 * 60
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      if (days >= 1) {
        auction['countdown'] = `${days}d ${hours}h`;
      } else if (hours >= 1) {
        auction['countdown'] = `${hours}h ${minutes}m`;
      } else {
        auction['countdown'] = `${minutes}m ${seconds}s`;
      }
    });
  }
}
