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
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { UserModel } from '../models/user';
import {
  catchError,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
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
  async getAuctions(userId?: string): Promise<Auction[]> {
    const snapshot = await getDocs(this.auctionsCollection);
    const auctions: Auction[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Auction;

      return {
        ...data,
        id: doc.id,
        endTimeDate: data.endtime ? data.endtime.toDate() : new Date(),
        isFavourite: false, // Default value
      };
    });

    // If no user is logged in, return auctions without checking favorites
    if (!userId) {
      return auctions;
    }

    // Fetch favorites only if userId is provided
    const favouritePromises = auctions.map(async (auction) => {
      const favSnapshot = await getDocs(
        query(
          collection(this.firestore, `auctions/${auction.id}/favourites`),
          where('userId', '==', userId),
        ),
      );
      return {
        ...auction,
        isFavourite: !favSnapshot.empty,
      };
    });

    return Promise.all(favouritePromises);
  }

  /** Get a single auction with real-time updates */
  getAuction(id: string, userId: string): Observable<Auction | null> {
    console.log(`Listening for real-time updates on auction ID: ${id}`);

    const auctionRef = doc(this.firestore, 'auctions', id);
    const bidsRef = collection(this.firestore, `auctions/${id}/bids`);

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

        return forkJoin({
          imageUrl: from(getDownloadURL(imageRef)).pipe(
            catchError(() => of('error.jpg')),
          ),
          isFavourited: from(
            getDocs(
              query(
                collection(this.firestore, `auctions/${id}/favourites`),
                where('userId', '==', userId),
              ),
            ),
          ).pipe(
            map((favSnapshot) => !favSnapshot.empty),
            catchError(() => of(false)),
          ),
          bidCount: from(getDocs(bidsRef)).pipe(
            map((bidSnapshot) => bidSnapshot.size),
            catchError(() => of(0)),
          ),
        }).pipe(
          map(({ imageUrl, isFavourited, bidCount }) => {
            auction.imageUrl = imageUrl;
            auction.isFavourite = isFavourited;
            auction.bidCount = bidCount; // Store bid count in auction object
            return auction;
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

  /** Toggle auction favourites */
  async toggleFavourites(userId: string, auctionId: string): Promise<void> {
    try {
      const favouritesCollection = collection(
        this.firestore,
        `auctions/${auctionId}/favourites`,
      );

      // Check if the user already favourited this auction
      const q = query(favouritesCollection, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // If favourite exists, remove it
        const favDoc = snapshot.docs[0]; // Get the first match
        await deleteDoc(favDoc.ref);
      } else {
        // Otherwise, add to favourites
        await addDoc(favouritesCollection, {
          userId,
          timestamp: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error toggling favourites:', error);
    }
  }
}
