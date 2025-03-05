import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  docData,
  Firestore,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { Auction } from '../models/auction';
import { getStorage, ref } from 'firebase/storage';
import { getDownloadURL } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private usersCollection: CollectionReference = collection(
    this.firestore,
    'users',
  );
  private auctionsCollection: CollectionReference = collection(
    this.firestore,
    'auctions',
  );

  private storage = getStorage();

  /**  Add new user to Firestore */
  async addUser(user: UserModel): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', user.email);
      await setDoc(userRef, user);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  }

  /**  Get all auctions  */
  async getAuctions(): Promise<Auction[]> {
    const snapshot = await getDocs(this.auctionsCollection);
    return snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        endTimeDate: data['endtime'] ? data['endtime'].toDate() : new Date(), // Ensure it's always a Date
      } as Auction;
    });
  }

  /** Get a single auction with real-time updates */
  getAuction(id: string): Observable<Auction | null> {
    console.log(`Listening for real-time updates on auction ID: ${id}`);

    const auctionRef = doc(this.firestore, 'auctions', id);

    return docData(auctionRef, { idField: 'id' }).pipe(
      switchMap((auctionData: any) => {
        if (!auctionData) return of(null);

        const auction: Auction = {
          id: id,
          ...auctionData,
          endTimeDate: auctionData.endtime?.toDate() ?? new Date(),
        };

        // Fetch image URL dynamically from Firebase Storage
        const imageRef = ref(
          this.storage,
          `auction-images/${auctionData.id}.jpg`,
        );

        return from(getDownloadURL(imageRef)).pipe(
          map((url) => {
            auction.imageUrl = url;
            return auction;
          }),
          catchError((error) => {
            console.error(`Error fetching image for auction ${id}:`, error);
            auction.imageUrl = 'assets/error.jpg'; // Fallback image
            return of(auction); // Use 'of()' instead of 'from([])'
          }),
        );
      }),
    );
  }

  /**  Fetch user details by email */
  async getUserDetailsByEmail(email: string): Promise<UserModel | null> {
    try {
      const userSnap = await getDoc(doc(this.firestore, `users/${email}`));
      return userSnap.exists() ? (userSnap.data() as UserModel) : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**  Update user details */
  async updateUserDetails(
    email: string,
    updates: Partial<UserModel>,
  ): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, `users/${email}`), updates);
    } catch (error) {
      console.error('Error updating user details:', error);
    }
  }

  /**  Add new auction (image handled separately in StorageService) */
  async addAuction(auction: Auction): Promise<string | null> {
    try {
      const { endTimeDate, ...auctionData } = auction;
      const docRef = await addDoc(this.auctionsCollection, {
        ...auctionData,
        winnerID: 'empty',
        status: 'active',
        endtime: Timestamp.fromDate(endTimeDate),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding auction:', error);
      return null;
    }
  }

  /**  Delete auction */
  async deleteAuction(auctionId: string): Promise<void> {
    if (!auctionId) return console.error('Error: Auction ID is undefined.');
    try {
      await deleteDoc(doc(this.firestore, 'auctions', auctionId));
    } catch (error) {
      console.error('Error deleting auction:', error);
    }
  }

  /**  Update auction details (supports partial updates) */
  async updateAuction(
    auctionId: string,
    updates: Partial<Auction>,
  ): Promise<void> {
    if (!auctionId) {
      console.error('Auction ID is missing.');
      return;
    }

    try {
      await updateDoc(doc(this.firestore, 'auctions', auctionId), updates);
    } catch (error) {
      console.error('Error updating auction:', error);
    }
  }
}
