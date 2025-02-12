import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  CollectionReference,
  doc,
  Firestore,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuctionService {
  usersCollection: CollectionReference; // Declare users collection reference
  auctionsCollection: CollectionReference;
  private firestore = inject(Firestore);

  constructor() {
    this.usersCollection = collection(this.firestore, 'users');
    this.auctionsCollection = collection(this.firestore, 'auctions');
  }

  async addBid(auctionID: string, bidPrice: number, userID: string) {
    try {
      // Reference to the auction document
      const auctionDocRef = doc(this.firestore, `auctions/${auctionID}`);
      const auctionSnap = await getDoc(auctionDocRef);

      if (!auctionSnap.exists()) {
        console.error('Auction does not exist');
        return;
      }

      const auctionData = auctionSnap.data();
      const currentHighestBid = auctionData?.['price'] ?? 0;
      const endTime = auctionData?.['endtime']?.toDate(); // Convert Firestore timestamp to Date

      if (!endTime) {
        console.error('Auction end time is missing');
        return;
      }

      const now = new Date();
      if (now >= endTime) {
        console.error('Auction has ended. Bidding is not allowed.');
        return;
      }

      if (bidPrice <= currentHighestBid) {
        console.error('Bid must be higher than the current highest bid');
        return;
      }

      // Reference to the "bids" subcollection inside the auction
      const bidsCollectionRef = collection(
        this.firestore,
        `auctions/${auctionID}/bids`,
      );

      // Add the bid document
      await addDoc(bidsCollectionRef, { bid: bidPrice, userID: userID });

      // Update the highest bid in the auction document
      await updateDoc(auctionDocRef, { price: bidPrice });

      console.log(
        `Bid added successfully to auction: ${auctionID}, New Highest Bid: ${bidPrice}`,
      );
    } catch (e) {
      console.error('Error adding bid: ', e);
    }
  }
}
