import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { Auth } from '@angular/fire/auth'; // Firebase Auth
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;

  // Mock Auth service
  class MockAuth {
    // Add necessary mock methods for the Auth service
    signInWithEmailAndPassword() {
      return of({ user: { email: 'test@example.com' } });
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useClass: MockAuth }, // Provide the mock Auth service
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
