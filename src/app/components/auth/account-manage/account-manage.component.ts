import { Component, OnInit } from '@angular/core';
import { TabPanel, TabView } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { CurrencyPipe, DatePipe, NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { FirestoreService } from '../../../services/firestore.service';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-account-manage',
  imports: [
    TabView,
    TabPanel,
    TableModule,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    NgIf,
    ButtonDirective,
    NgForOf,
  ],
  templateUrl: './account-manage.component.html',
  styleUrl: './account-manage.component.scss',
})
export class AccountManageComponent implements OnInit {
  wonAuctions: any[] = [];
  authState$!: Observable<User | null>;
  user: User | null = null;
  editingField: string | null = null;
  newPassword: string = '';

  userData: { [key: string]: string } = {
    email: '',
    forename: '',
    surname: '',
  };

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit() {
    this.authService.authState$.subscribe(async (user) => {
      if (user) {
        this.user = user;
        this.userData['email'] = user.email || '';

        try {
          const userDetails = await this.firestoreService.getUserDetailsByEmail(
            this.userData['email'],
          );
          if (userDetails) {
            this.userData['forename'] = userDetails.forename || 'N/A';
            this.userData['surname'] = userDetails.surname || 'N/A';
          }
        } catch (error) {
          console.error('Failed to fetch Firestore user details:', error);
        }
      }
    });
  }

  editField(field: string) {
    this.editingField = field;
  }

  async saveChanges() {
    try {
      if (this.editingField === 'email') {
        await this.authService.updateUserEmail(this.userData['email']);
        console.log('Email updated successfully');
      }

      if (this.editingField === 'password' && this.newPassword) {
        await this.authService.updateUserPassword(this.newPassword);
        console.log('Password updated successfully');
      }

      if (this.editingField === 'forename' || this.editingField === 'surname') {
        await this.firestoreService.updateUserDetails(this.userData['email'], {
          [this.editingField]: this.userData[this.editingField!],
        });
        console.log(`${this.editingField} updated successfully in Firestore`);
      }

      this.editingField = null;
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  cancelEdit() {
    this.editingField = null;
  }
}
