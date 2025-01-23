import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { AsyncPipe, NgIf } from '@angular/common';
import { Checkbox } from 'primeng/checkbox';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { FirestoreService } from '../../../services/firestore.service';
import { UserModel } from '../../../models/user';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    AsyncPipe,
    NgIf,
    Checkbox,
    ButtonDirective,
    InputText,
    Ripple,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  emaiLogin: string = '';
  passwordLogin: string = '';

  emailRegister: string = '';
  passwordRegister: string = '';
  firstName: string = '';
  lastName: string = '';
  dob: string = '';

  isRegistering: boolean = false;

  authState$!: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit() {
    this.authState$ = this.authService.authState$;
  }

  register() {
    this.authService
      .createUser(this.emailRegister, this.passwordRegister)
      .then((user) => {
        // Create a new User object
        const newUser: UserModel = {
          forename: this.firstName,
          surname: this.lastName,
          DOB: new Date(this.dob),
          email: this.emailRegister,
          userID: user.uid,
          admin: false, // You can adjust this based on the user's role
        };

        // Add the new user to Firestore
        this.firestoreService
          .addUser(newUser)
          .then(() => {
            console.log('User successfully registered and added to Firestore');
            // Optionally, redirect or show success message
          })
          .catch((error) => {
            console.error('Error adding user to Firestore:', error);
          });
      })
      .catch((error) => {
        console.error('Error during registration:', error);
      });
  }

  login() {
    this.authService
      .loginUser(this.emaiLogin, this.passwordLogin)
      .then((user) => {
        // Handle success (e.g., redirect to dashboard or home page)
      })
      .catch((error) => {
        // Handle error (e.g., show error message to user)
      });
  }

  logout() {
    this.authService
      .logout()
      .then(() => {})
      .catch((error) => {});
  }

  toggleForm() {
    this.isRegistering = !this.isRegistering;
  }
}
