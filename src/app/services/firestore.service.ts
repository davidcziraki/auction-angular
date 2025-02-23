import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  Firestore,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';
import { Observable } from 'rxjs';
import { Auction } from '../models/auction';
import { getStorage, ref } from 'firebase/storage';
import {
  deleteObject,
  getDownloadURL,
  uploadBytes,
} from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  usersCollection: CollectionReference; // Declare users collection reference
  auctionsCollection: CollectionReference;
  private firestore = inject(Firestore);
  private storage = getStorage();

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

  // Add New Auction
  async addAuction(auction: Auction, imageFile?: File) {
    try {
      const { endTimeDate, ...auctionData } = auction;
      const auctionsRef = collection(this.firestore, 'auctions');

      // Add auction to Firestore
      const docRef = await addDoc(auctionsRef, auctionData);
      console.log('Auction added with ID:', docRef.id);

      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await this.uploadImage(docRef.id, imageFile);
        await updateDoc(doc(this.firestore, 'auctions', docRef.id), {
          imageUrl,
        });
      }

      console.log(
        'Image uploaded and Firestore updated with image URL:',
        imageUrl,
      );
    } catch (error) {
      console.error('Error adding auction:', error);
    }
  }

  async deleteAuction(auction: Auction) {
    if (!auction.id) {
      console.error('Error: Auction ID is undefined.');
      return;
    }

    try {
      const auctionRef = doc(this.firestore, 'auctions', auction.id);
      await deleteDoc(auctionRef);
      console.log(`Auction ${auction.id} deleted from Firestore.`);

      // Delete the image from Firebase Storage if it exists
      if (auction.imageUrl) {
        const imageRef = ref(this.storage, `auction-images/${auction.id}.jpg`);
        await deleteObject(imageRef);
        console.log(`Image deleted for auction ${auction.id}.`);
      }
    } catch (error) {
      console.error('Error deleting auction:', error);
    }
  }

  private async uploadImage(auctionId: string, file: File): Promise<string> {
    const imageRef = ref(this.storage, `auction-images/${auctionId}.jpg`);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  }
}
