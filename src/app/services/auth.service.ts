import { inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  User,
} from '@angular/fire/auth';
import { Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  authState$: Observable<User | null> = authState(this.auth);
  private authSubscription: Subscription;

  constructor() {
    this.authSubscription = this.authState$.subscribe((user: User | null) => {
      console.log('User Authed:', user);
    });
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
  }

  // Create a new user
  async createUser(email: string, password: string): Promise<any> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      // Signed up
      const user = userCredential.user;
      console.log('User signed up:', user);
      return user;
    } catch (error: any) {
      // Proper error handling with FirebaseError type
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error(`Error code: ${errorCode}, Error message: ${errorMessage}`);
      throw new Error(errorMessage); // Rethrow or handle accordingly
    }
  }

  // Login user
  async loginUser(
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<any> {
    try {
      // Set persistence based on "Remember Me" checkbox
      const persistenceType = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(this.auth, persistenceType);

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      console.log('User signed in:', userCredential.user);
      return userCredential.user;
    } catch (error: any) {
      console.error(
        `Error code: ${error.code}, Error message: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('User signed out successfully');
    } catch (error: any) {
      // Proper error handling with type assertion
      const errorMessage =
        (error as Error).message || 'An unknown error occurred';
      console.error('Sign-out failed:', errorMessage);
      throw new Error(errorMessage); // Rethrow for handling in the UI
    }
  }
}
