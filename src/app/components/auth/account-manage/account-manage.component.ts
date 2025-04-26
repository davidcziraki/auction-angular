import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { FirestoreService } from '../../../services/firestore.service';
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
import { Button, ButtonDirective } from 'primeng/button';
import { AuctionService } from '../../../services/auction.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { MessagesModule } from 'primeng/messages';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { CurrencyPipe, DatePipe, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-account-manage',
  templateUrl: './account-manage.component.html',
  styleUrl: './account-manage.component.scss',
  providers: [MessageService],
  imports: [
    TableModule,
    FormsModule,
    MessagesModule,
    Toast,
    Button,
    Dialog,
    ReactiveFormsModule,
    TabsModule,
    NgForOf,
    NgIf,
    ButtonDirective,
    CurrencyPipe,
    DatePipe,
  ],
})
export class AccountManageComponent implements OnInit {
  tabValue: number = 0;
  isMobileView = false;

  wonAuctions: any[] = [];
  authState$!: Observable<User | null>;
  user: User | null = null;
  editingFields: Set<string> = new Set();
  displayDeleteModal: boolean = false;
  userData: { [key: string]: string } = {
    email: '',
    forename: '',
    surname: '',
  };
  accountSettingsForm!: FormGroup;
  originalUserData: any;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private auctionService: AuctionService,
    private router: Router,
    private messageService: MessageService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));

    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam) {
        this.tabValue = parseInt(tabParam, 10); // or whatever your logic is
      }
    });

    this.authService.authState$.subscribe(async (user) => {
      if (user) {
        this.user = user;
        this.userData['email'] = user.email || '';
        await this.loadUserDetails(user.email || '');
      }
    });

    this.accountSettingsForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      forename: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)],
      ],
      surname: [
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

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  // Fetch user details and initialize form
  async loadUserDetails(email: string) {
    try {
      const userDetails =
        await this.firestoreService.getUserDetailsByEmail(email);
      if (userDetails) {
        this.userData['forename'] = userDetails.forename || 'N/A';
        this.userData['surname'] = userDetails.surname || 'N/A';

        this.accountSettingsForm.patchValue({
          email: this.userData['email'],
          forename: this.userData['forename'],
          surname: this.userData['surname'],
          password: '',
        });

        this.originalUserData = { ...this.accountSettingsForm.value }; // Clone the form values
        await this.loadWonAuctions(this.user?.uid || '');
      }
    } catch (error) {
      console.error('Failed to fetch Firestore user details:', error);
    }
  }

  // Edit specific fields
  editField(field: string) {
    this.editingFields.add(field);
    this.accountSettingsForm.get(field)?.markAsTouched();
  }

  // Save changes to Firestore and Auth
  async saveChanges() {
    try {
      const updates: any = {};
      const email = this.accountSettingsForm.get('email')?.value;

      for (const field of this.editingFields) {
        const value = this.accountSettingsForm.get(field)?.value;

        if (field === 'email') {
          await this.authService.updateUserEmail(value);
          console.log('Email updated successfully');
        }

        if (field === 'password' && value) {
          await this.authService.updateUserPassword(value);
          console.log('Password updated successfully');
        }

        if (field === 'forename' || field === 'surname') {
          updates[field] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.firestoreService.updateUserDetails(email, updates);
        console.log('User details updated successfully in Firestore:', updates);
      }

      this.editingFields.clear();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  // Cancel editing and revert to original data
  cancelEdit() {
    this.editingFields.clear();
    this.accountSettingsForm.reset(this.originalUserData);
  }

  // Load auctions won by the user
  async loadWonAuctions(userId: string) {
    try {
      const wonAuctionsSnapshot =
        await this.auctionService.getWonAuctions(userId);
      this.wonAuctions = wonAuctionsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          endtime: data['endtime']?.toDate
            ? data['endtime'].toDate()
            : data['endtime'],
        };
      });
    } catch (error) {
      console.error('Error fetching won auctions:', error);
    }
  }

  // Navigate to the cart for a specific auction
  goToCart(auctionId: string) {
    this.router.navigate(['cart', auctionId]);
  }

  // Confirm account deletion
  confirmDeleteAccount() {
    this.displayDeleteModal = true;
  }

  // Delete user account
  async deleteAccount() {
    try {
      await this.authService.deleteUser();
      this.messageService.add({
        severity: 'success',
        summary: 'Account Deleted',
        detail: 'Your account has been successfully deleted.',
      });

      this.displayDeleteModal = false;

      setTimeout(() => {
        this.router.navigate(['/home']).then(() => {
          window.location.reload();
        });
      }, 1500);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'There has been an error. Please contact administration or try again later.',
      });
    }
  }

  // Cancel account deletion
  cancelDelete() {
    this.displayDeleteModal = false;
  }

  areEditedFieldsValid(): boolean {
    // Check if all the edited fields are valid
    return Array.from(this.editingFields).every(
      (field) => this.accountSettingsForm.get(field)?.valid,
    );
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
