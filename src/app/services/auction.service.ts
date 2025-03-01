import { inject, Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  Firestore,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Auction } from '../models/auction';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuctionService {
  usersCollection: CollectionReference; // Declare users collection reference
  auctionsCollection: CollectionReference;
  authState$!: Observable<User | null>;
  user: User | null = null;
  private firestore = inject(Firestore);

  constructor(private authService: AuthService) {
    this.usersCollection = collection(this.firestore, 'users');
    this.auctionsCollection = collection(this.firestore, 'auctions');
    this.authState$ = this.authService.authState$;

    this.authState$.subscribe((user) => {
      this.user = user;
    });
  }

  checkAuctionsPeriodically() {
    console.log('Starting periodic auction check...');

    setInterval(async () => {
      const startTime = new Date();
      console.log(`[${startTime.toISOString()}] Running auction checker...`);

      try {
        await this.processEndedAuctions();
        const endTime = new Date();
        console.log(
          `[${endTime.toISOString()}] Auction checker completed successfully.`,
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Error in auction checker:`,
          error,
        );
      }
    }, 60000); // Runs every 60 seconds
  }

  async addBid(auctionID: string, bidPrice: number, userID: string) {
    if (!userID) {
      throw new Error('User ID is missing');
    }

    try {
      const auctionDocRef = doc(this.firestore, `auctions/${auctionID}`);
      const bidsCollectionRef = collection(
        this.firestore,
        `auctions/${auctionID}/bids`,
      );

      await runTransaction(this.firestore, async (transaction) => {
        const auctionSnap = await transaction.get(auctionDocRef);

        if (!auctionSnap.exists()) {
          throw new Error('Auction does not exist');
        }

        const auctionData = auctionSnap.data() as Auction;
        const currentHighestBid = auctionData?.price ?? 0;
        const endTime = auctionData?.endtime?.toDate(); // Convert Firestore timestamp to Date

        if (!endTime) {
          throw new Error('Auction end time is missing');
        }

        const now = new Date();
        if (now >= endTime) {
          throw new Error('Auction has ended. Bidding is not allowed.');
        }

        if (bidPrice <= currentHighestBid) {
          throw new Error('Bid must be higher than the current highest bid');
        }

        // Add the bid document inside the transaction
        const bidDocRef = doc(bidsCollectionRef);
        transaction.set(bidDocRef, { bid: bidPrice, userID: userID });

        // Update the highest bid in the auction document
        transaction.update(auctionDocRef, { price: bidPrice });
      });

      console.log(
        `Bid added successfully to auction: ${auctionID}, New Highest Bid: ${bidPrice}`,
      );
    } catch (e) {
      console.error('Error adding bid: ', e);
    }
  }

  async processEndedAuctions() {
    try {
      const auctionsCollection = collection(this.firestore, 'auctions');
      const endedAuctionsQuery = query(
        auctionsCollection,
        where('winnerID', '==', ''),
        where('endtime', '<=', new Date()),
      );

      const snapshot = await getDocs(endedAuctionsQuery);
      for (const auctionDoc of snapshot.docs) {
        await this.assignWinner(auctionDoc.id); // Assign winner when auction ends
      }
    } catch (error) {
      console.error('Error processing ended auctions:', error);
    }
  }

  async assignWinner(auctionID: string) {
    const bidsCollection = collection(
      this.firestore,
      `auctions/${auctionID}/bids`,
    );
    const bidsSnapshot = await getDocs(bidsCollection);

    if (!bidsSnapshot.empty) {
      const highestBid = bidsSnapshot.docs.reduce((prev, current) =>
        prev.data()['bid'] > current.data()['bid'] ? prev : current,
      );
      const winnerID = highestBid.data()['userID'];

      const auctionDocRef = doc(this.firestore, `auctions/${auctionID}`);
      await updateDoc(auctionDocRef, {
        winnerID: winnerID,
        status: 'completed',
      });
    } else {
      console.log(`Auction ${auctionID} ended with no bids.`);
    }
  }
}
