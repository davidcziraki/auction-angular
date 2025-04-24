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
  combineLatest,
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
  private applicationsCollection: CollectionReference = collection(
    this.firestore,
    'applications',
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

      // Fetch bids in the last 24 hours
      const bidsRef = collection(this.firestore, `auctions/${auction.id}/bids`);
      const bidSnapshot = await getDocs(bidsRef);
      const bidsInLast24Hrs = bidSnapshot.docs.filter((bidDoc) => {
        const bidTime = bidDoc.data()['timestamp']?.toDate() ?? new Date();
        const now = new Date();
        return now.getTime() - bidTime.getTime() <= 24 * 60 * 60 * 1000;
      }).length;

      // Add "POPULAR" if there are at least 5 bids in the last 24 hours
      const isPopular = bidsInLast24Hrs >= 5;

      // Check if auction is ending soon (less than 6 hours)
      const now = new Date();
      const timeRemaining = auction.endTimeDate.getTime() - now.getTime();
      const isEndingSoon =
        timeRemaining <= 6 * 60 * 60 * 1000 && timeRemaining > 0; // 6 hours in ms

      return {
        ...auction,
        isFavourite: !favSnapshot.empty,
        isPopular: isPopular,
        isEndingSoon: isEndingSoon,
      };
    });

    return Promise.all(favouritePromises);
  }

  /** Get a single auction with real-time updates */
  getAuction(id: string, userId: string): Observable<Auction | null> {
    console.log(`Listening for real-time updates on auction ID: ${id}`);

    const auctionRef = doc(this.firestore, 'auctions', id);
    const bidsRef = collection(this.firestore, `auctions/${id}/bids`);
    const imageRef = ref(this.storage, `auction-images/${id}/main.jpg`);

    return docData(auctionRef, { idField: 'id' }).pipe(
      switchMap((auctionData: any) => {
        if (!auctionData) return of(null);

        const auction: Auction = {
          id: id,
          ...auctionData,
          endTimeDate: auctionData.endtime?.toDate() ?? new Date(),
          bids: [],
        };

        // Fetch image URL and other auction data
        return combineLatest([
          from(getDownloadURL(imageRef)).pipe(
            catchError(() => of('error.jpg')),
          ), // Image URL
          from(
            getDocs(
              query(
                collection(this.firestore, `auctions/${id}/favourites`),
                where('userId', '==', userId),
              ),
            ),
          ).pipe(
            map((favSnapshot) => !favSnapshot.empty),
            catchError(() => of(false)),
          ), // Check if favourited
          from(getDocs(bidsRef)).pipe(
            map((bidSnapshot) => {
              return bidSnapshot.docs
                .map((doc) => {
                  const bidData = doc.data();
                  return {
                    bidAmount: bidData['bid'],
                    bidDate: bidData['timestamp']?.toDate() ?? new Date(),
                  };
                })
                .sort((a, b) => b.bidAmount - a.bidAmount);
            }),
            catchError(() => of([])), // Return empty array in case of error
          ), // Bids data
        ]).pipe(
          map(([imageUrl, isFavourited, bids]) => {
            auction.imageUrl = imageUrl;
            auction.isFavourite = isFavourited;
            auction.bids = bids;
            auction.bidCount = bids.length; // Count bids

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

  /**  Add new auction application (image handled separately in StorageService) */
  async submitAuction(auction: Auction): Promise<string | null> {
    try {
      const { endTimeDate, ...auctionData } = auction;
      const docRef = await addDoc(this.applicationsCollection, {
        ...auctionData,
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

  /**  Update auction application details (supports partial updates) */
  async updateApplication(
    auctionId: string,
    updates: Partial<Auction>,
  ): Promise<void> {
    if (!auctionId) {
      console.error('Auction ID is missing.');
      return;
    }

    try {
      await updateDoc(doc(this.firestore, 'applications', auctionId), updates);
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

  async submitCarApplication(applicationData: any): Promise<void> {
    try {
      await addDoc(collection(this.firestore, 'applications'), applicationData);
      console.log('Application submitted successfully');
    } catch (error) {
      console.error('Error submitting application:', error);
    }
  }

  async getApplicationsAdmin(): Promise<any[]> {
    try {
      const snapshot = await getDocs(this.applicationsCollection);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }

  async getApplicationsSeller(userEmail: string): Promise<any[]> {
    try {
      if (!userEmail) {
        console.error('User email is required');
        return [];
      }

      console.log(this.applicationsCollection);
      console.log(userEmail);
      // Fetch applications where seller matches userEmail
      const applicationsQuery = query(
        this.applicationsCollection,
        where('seller', '==', userEmail),
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const applications = applicationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch auctions where seller matches userEmail
      const auctionsQuery = query(
        this.auctionsCollection,
        where('seller', '==', userEmail),
      );
      const auctionsSnapshot = await getDocs(auctionsQuery);
      const auctions = auctionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Combine results
      return [...applications, ...auctions];
    } catch (error) {
      console.error('Error fetching seller applications and auctions:', error);
      return [];
    }
  }

  /** Approve an application: move it to the auctions collection */
  async approveApplication(applicationId: string): Promise<void> {
    try {
      // Get application data
      const appRef = doc(this.firestore, 'applications', applicationId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        console.error('Application not found');
        return;
      }

      const appData = appSnap.data();

      // Move to the auctions collection
      const auctionRef = doc(this.firestore, 'auctions', applicationId);
      await setDoc(auctionRef, {
        ...appData,
        status: 'Active',
        winnerID: 'empty',
      });

      // Delete from applications collection
      await deleteDoc(appRef);

      console.log(
        `Application ${applicationId} approved and moved to auctions.`,
      );
    } catch (error) {
      console.error('Error approving application:', error);
    }
  }

  /** Deny an application: update status to "Denied" */
  async denyApplication(applicationId: string): Promise<void> {
    try {
      const appRef = doc(this.firestore, 'applications', applicationId);
      await deleteDoc(appRef);

      console.log(`Application ${applicationId} has been denied.`);
    } catch (error) {
      console.error('Error denying application:', error);
    }
  }
}
