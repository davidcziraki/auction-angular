import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  doc,
  Firestore,
  setDoc,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';
import { Observable } from 'rxjs';
import { Auction } from '../models/auction';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  usersCollection: CollectionReference; // Declare users collection reference
  auctionsCollection: CollectionReference;
  private firestore = inject(Firestore);

  constructor() {
    this.usersCollection = collection(this.firestore, 'users');
    this.auctionsCollection = collection(this.firestore, 'auctions');
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

  // Get all auctions
  getAuctions(): Observable<Auction[]> {
    return collectionData(this.auctionsCollection, {
      idField: 'id',
    }) as Observable<Auction[]>;
  }
}
