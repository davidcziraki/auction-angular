import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  docData,
  Firestore,
  getDocs,
} from '@angular/fire/firestore';
import { Auction } from '../models/auction';
import { getStorage, ref } from 'firebase/storage';
import { getDownloadURL } from '@angular/fire/storage';
import { catchError, from, map, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private storage = getStorage();
  private db = inject(Firestore);

  async loadAuctions(): Promise<Auction[]> {
    console.log('listAuctionsWithImages function called');

    try {
      // Fetch all documents from the 'auctions' collection
      const querySnapshot = await getDocs(collection(this.db, 'auctions'));
      const auctions: Auction[] = [];

      // Fetch image URLs for each auction in parallel
      const auctionPromises = querySnapshot.docs.map(async (doc) => {
        const docData = doc.data();
        const auctionData: Auction = { id: doc.id, ...docData } as Auction;

        // Date conversion
        auctionData.endTimeDate = <Date>auctionData.endtime?.toDate();

        try {
          // Construct the image reference and fetch the download URL using auction ID
          const imageRef = ref(this.storage, `${auctionData.id}.jpg`);
          auctionData.imageUrl = await getDownloadURL(imageRef); // Assign image URL to imageUrl property
          console.log(`Fetched image for auction ${doc.id}`);
        } catch (imageError) {
          console.error(
            `Error fetching image for auction ${doc.id}: `,
            imageError,
          );
          auctionData.imageUrl = 'assets/error.jpg'; // Fallback image
        }

        return auctionData;
      });

      // Wait for all promises to resolve
      const resolvedAuctions = await Promise.all(auctionPromises);
      auctions.push(...resolvedAuctions);

      return auctions;
    } catch (error) {
      console.error('Error fetching auctions: ', error);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  // async getAuction(id: string): Promise<Auction | null> {
  //   console.log(`Fetching auction with ID: ${id}`);
  //
  //   try {
  //     // Reference to the specific auction document
  //     const auctionRef = doc(this.db, 'auctions', id);
  //     const auctionSnap = await getDoc(auctionRef);
  //
  //     if (!auctionSnap.exists()) {
  //       console.warn(`Auction with ID ${id} not found.`);
  //       return null; // Return null if auction doesn't exist
  //     }
  //
  //     const auctionData: Auction = {
  //       id: auctionSnap.id,
  //       ...auctionSnap.data(),
  //     } as Auction;
  //
  //     // Convert Firestore timestamp to Date
  //     auctionData.endTimeDate = <Date>auctionData.endtime?.toDate();
  //
  //     try {
  //       // Fetch image URL from Firebase Storage
  //       const imageRef = ref(this.storage, `${auctionData.id}.jpg`);
  //       auctionData.imageUrl = await getDownloadURL(imageRef);
  //       console.log(`Fetched image for auction ${id}`);
  //     } catch (imageError) {
  //       console.error(`Error fetching image for auction ${id}:`, imageError);
  //       auctionData.imageUrl = 'assets/error.jpg'; // Fallback image
  //     }
  //
  //     return auctionData;
  //   } catch (error) {
  //     console.error('Error fetching auction:', error);
  //     throw error;
  //   }
  // }

  getAuction(id: string): Observable<Auction | null> {
    console.log(`Listening for real-time updates on auction ID: ${id}`);

    const auctionRef = doc(this.db, 'auctions', id);

    return docData(auctionRef, { idField: 'id' }).pipe(
      switchMap((auctionData: any) => {
        if (!auctionData) return from([null]);

        const auction: Auction = {
          id: id,
          ...auctionData,
          endTimeDate: auctionData.endtime?.toDate() ?? new Date(),
        };

        // Fetch image URL dynamically from Firebase Storage
        const imageRef = ref(this.storage, `${auction.id}.jpg`);
        return from(getDownloadURL(imageRef)).pipe(
          map((url) => {
            auction.imageUrl = url;
            return auction;
          }),
          catchError((error) => {
            console.error(`Error fetching image for auction ${id}:`, error);
            auction.imageUrl = 'assets/error.jpg'; // Fallback image
            return from([auction]); // Ensure Observable<Auction | null>
          }),
        );
      }),
    );
  }
}
