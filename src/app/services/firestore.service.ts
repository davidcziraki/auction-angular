import { inject, Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  Firestore,
  setDoc,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  usersCollection: CollectionReference; // Declare users collection reference
  private firestore = inject(Firestore);

  constructor() {
    this.usersCollection = collection(this.firestore, 'users');
  }

  async addUser(user: UserModel) {
    try {
      const userRef = doc(this.firestore, 'users', user.email); // Set document reference using user email as the ID
      await setDoc(userRef, user); // Set the user data in the document

      console.log('Document written with ID:', user.email); // Email is used as document ID
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  }
}
