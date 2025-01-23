import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';
import { AsyncPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [FormsModule, AsyncPipe, NgIf],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  emaiLogin: string = '';
  passwordLogin: string = '';

  emailRegister: string = '';
  passwordRegister: string = '';

  email: string | null = null;
  authState$!: Observable<User | null>;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authState$ = this.authService.authState$;
  }

  register() {
    this.authService
      .createUser(this.emailRegister, this.passwordRegister)
      .then((user) => {
        // Handle success
      })
      .catch((error) => {
        // Handle error
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
}
