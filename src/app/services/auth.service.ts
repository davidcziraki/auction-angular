import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  Auth,
  authState,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  User,
} from '@angular/fire/auth';
import { Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private auth = inject(Auth);
  authState$: Observable<User | null> = authState(this.auth);
  private authSubscription: Subscription;

  constructor() {
    // Prevent unnecessary console logs in production
    this.authSubscription = this.authState$.subscribe();
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }

  // Create a new user and send email verification
  async createUser(email: string, password: string): Promise<User> {
    try {
      const { user } = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password,
      );

      if (!user) throw new Error('User creation failed');

      await sendEmailVerification(user);
      return user;
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Login user
  async loginUser(
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<User> {
    try {
      await setPersistence(
        this.auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      const { user } = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );

      return user;
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Update user email
  async updateUserEmail(newEmail: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    try {
      await updateEmail(user, newEmail);
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Update user password
  async updateUserPassword(newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    try {
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Send password reset email
  async sendPasswordReset(email: string): Promise<void> {
    if (!email) throw new Error('Email is required for password reset');

    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

  // Handle Firebase-specific errors with cleaner messages
  private handleFirebaseError(error: any): Error {
    const errorMessage = error?.message || 'An unknown error occurred';
    console.error('Firebase Error:', errorMessage);
    return new Error(errorMessage);
  }


  // Delete user account
  async deleteUser(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user found');

    try {
      await deleteUser(user);
    } catch (error: any) {
      throw this.handleFirebaseError(error);
    }
  }

}
