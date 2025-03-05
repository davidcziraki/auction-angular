import { inject, Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  Firestore,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Auction } from '../models/auction';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { getAuth, User } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuctionService {
  authState$!: Observable<User | null>;
  private firestore = inject(Firestore);
  private auctionsCollection: CollectionReference;
  private usersCollection: CollectionReference;
  private user: User | null = null;

  constructor(private authService: AuthService) {
    this.usersCollection = collection(this.firestore, 'users');
    this.auctionsCollection = collection(this.firestore, 'auctions');
    this.authState$ = this.authService.authState$;

    this.authState$.subscribe((user) => (this.user = user));
  }

  /**
   * Periodically checks and processes ended auctions.
   */
  checkAuctionsPeriodically() {
    console.log('Starting periodic auction check...');
    setInterval(async () => {
      console.log(`[${new Date().toISOString()}] Running auction checker...`);
      try {
        await this.processEndedAuctions();
        console.log(`[${new Date().toISOString()}] Auction check complete.`);
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Auction check failed:`,
          error,
        );
      }
    }, 60000); // Runs every 60 seconds
  }

  /**
   * Places a bid on an auction, ensuring proper authorization and transaction safety.
   */
  async addBid(auctionID: string, bidPrice: number, userID: string) {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser)
      throw new Error('User must be authenticated to place a bid');
    if (currentUser.uid !== userID)
      throw new Error('User ID mismatch. Unauthorized action');

    const auctionDocRef = doc(this.firestore, `auctions/${auctionID}`);
    const bidsCollectionRef = collection(
      this.firestore,
      `auctions/${auctionID}/bids`,
    );

    try {
      await runTransaction(this.firestore, async (transaction) => {
        const auctionSnap = await transaction.get(auctionDocRef);
        if (!auctionSnap.exists()) throw new Error('Auction does not exist');

        const auctionData = auctionSnap.data() as Auction;
        const currentHighestBid = auctionData?.price ?? 0;
        const endTime = auctionData?.endtime?.toDate();

        if (!endTime) throw new Error('Auction end time is missing');
        if (new Date() >= endTime)
          throw new Error('Auction has ended. Bidding is not allowed.');
        if (bidPrice <= currentHighestBid)
          throw new Error('Bid must be higher than the current highest bid');

        // Add the bid document
        transaction.set(doc(bidsCollectionRef), {
          bid: bidPrice,
          userID: userID,
          timestamp: serverTimestamp(),
        });

        // Update auction's highest bid
        transaction.update(auctionDocRef, { price: bidPrice });

        console.log(
          `Bid placed successfully: Auction ${auctionID}, Amount: ${bidPrice}`,
        );
      });

      return true; // Indicate success
    } catch (error) {
      console.error('Error adding bid:', error);
      throw error; // Ensure error is passed to the component
    }
  }

  /**
   * Processes auctions that have ended by assigning a winner or marking them as expired.
   */
  async processEndedAuctions() {
    try {
      const endedAuctionsQuery = query(
        this.auctionsCollection,
        where('winnerID', '==', 'empty'),
        where('status', '!=', 'expired'),
        where('endtime', '<=', new Date()),
      );

      const snapshot = await getDocs(endedAuctionsQuery);
      if (snapshot.empty) {
        console.log('No ended auctions to process.');
        return;
      }

      console.log(`Processing ${snapshot.size} ended auctions...`);
      const batch = writeBatch(this.firestore); // Use batch for efficiency

      for (const auctionDoc of snapshot.docs) {
        const auctionID = auctionDoc.id;
        const auctionRef = doc(this.firestore, `auctions/${auctionID}`);
        const bidsSnapshot = await getDocs(
          collection(this.firestore, `auctions/${auctionID}/bids`),
        );

        if (!bidsSnapshot.empty) {
          // Find highest bid
          const highestBid = bidsSnapshot.docs.reduce((prev, current) =>
            prev.data()['bid'] > current.data()['bid'] ? prev : current,
          );
          const winnerID = highestBid.data()['userID'];

          // Batch update auction with winner details
          batch.update(auctionRef, {
            winnerID: winnerID,
            status: 'completed',
          });

          console.log(`Auction ${auctionID} completed. Winner: ${winnerID}`);
        } else {
          // No bids, mark auction as expired
          batch.update(auctionRef, {
            winnerID: 'empty',
            status: 'expired',
          });

          console.log(`Auction ${auctionID} expired with no bids.`);
        }
      }

      await batch.commit(); // Commit all updates in one go
      console.log('All ended auctions processed successfully.');
    } catch (error) {
      console.error('Error processing ended auctions:', error);
    }
  }

  /**
   * Fetches all auctions won by a specific user.
   */
  async getWonAuctions(userId: string) {
    return await getDocs(
      query(this.auctionsCollection, where('winnerID', '==', userId)),
    );
  }
}
