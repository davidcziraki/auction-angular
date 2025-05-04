import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { Auction } from '../../models/auction';
import { getAuth } from '@angular/fire/auth';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Subscription } from 'rxjs';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-cart',
  imports: [DatePipe, NgIf, DecimalPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnDestroy, AfterViewInit {
  isLoading: boolean = true;
  handlingApplication: boolean = false;

  auctionId: string | null = null;
  auction: Auction | null = null;
  vatAmount: number = 0;
  shippingCost: number = 5000; // Flat shipping fee
  totalCost: number = 0;
  hideCheckoutCard: boolean = false;

  private stripe: Stripe | null = null;
  private auctionSubscription?: Subscription;
  private checkoutInstance: any = null;

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
    private paymentService: PaymentService,
  ) {}


  async ngAfterViewInit() {
    this.isLoading = true;
    this.stripe = await loadStripe(
      'pk_test_51Qz6yCKigABo6LYNncGHQE1npiAbeZXiVNm3WwYPVTI4A67o9rIgtalMkCLhgK0NLoniDRJHfjxNOgsDXMAo0wBr00asmo1tbC',
    );

    if (!this.stripe) {
      console.error('Failed to load Stripe');
      return;
    }

    console.log('Stripe initialized successfully!');
    await this.fetchAuctionDetails();

    if (this.auction?.status === 'completed') {
      // ✅ Existing logic
      await this.proceedToPayment();
      console.log("normal recognised")

    } else if (this.auction?.status === 'Pending') {
      // 💳 Show listing fee payment instead of regular checkout
      await this.startListingFeePayment();
      console.log("listing fee recognised")
    }

    this.isLoading = false;
  }

  calculateTotals(price: number) {
    this.vatAmount = Math.ceil(price * 0.27); // Round up VAT
    this.totalCost = price + this.vatAmount + this.shippingCost;
  }

  async proceedToPayment() {
    if (!this.auction) {
      console.error('No auction data available');
      return;
    }

    this.hideCheckoutCard = true;

    // ✅ Unmount previous instance if it exists
    if (this.checkoutInstance) {
      console.warn('Unmounting existing Stripe Checkout instance...');
      this.checkoutInstance.unmount(); // 🧼 Cleanup before reinitializing
      this.checkoutInstance = null;
    }

    try {
      const response = (await this.paymentService
        .createCheckoutSession({
          auctionId: this.auctionId,
          year: this.auction.year,
          make: this.auction.make,
          model: this.auction.model,
          auctionImage: this.auction.mainImageUrl,
          price: this.totalCost,
        })
        .toPromise()) as { clientSecret: string };

      if (!response || !response['clientSecret']) {
        throw new Error('Error: No clientSecret received from backend.');
      }

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      this.checkoutInstance = await this.stripe.initEmbeddedCheckout({
        clientSecret: response['clientSecret'],
      });

      this.checkoutInstance.mount('#checkout');
    } catch (error) {
      console.error('Error during checkout:', error);
      this.hideCheckoutCard = false; // Show checkout card again on error
    }
  }

  async startListingFeePayment() {
    this.hideCheckoutCard = true;

    try {

      if (!this.auction?.id) {
        console.error('No auction data available');
        return;
      }
      const response = await this.paymentService.createListingFee(this.auction?.id).toPromise();

      // Check for clientSecret as that's what your backend returns
      if (!response || !response['clientSecret']) {
        throw new Error('Error: No clientSecret received from backend.');
      }

      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      this.checkoutInstance = await this.stripe.initEmbeddedCheckout({
        clientSecret: response['clientSecret'],
      });

      this.checkoutInstance.mount('#checkout');
    } catch (error) {
      console.error('Error starting listing fee payment:', error);
      this.hideCheckoutCard = false;
    }
  }




  ngOnDestroy() {
    console.log('[Checkout] Component destroyed');
    this.auctionSubscription?.unsubscribe();

    if (this.checkoutInstance) {
      console.log('[Checkout] Destroying Stripe Checkout instance...');
      this.checkoutInstance.destroy?.(); // If supported
      this.checkoutInstance = null;
    }
  }

  private fetchAuctionDetails(): Promise<void> {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentUserID = currentUser?.uid as string;

      this.auctionId = this.route.snapshot.paramMap.get('id');
      if (!this.auctionId) {
        reject('Auction ID not found in route');
        return;
      }

      this.auctionSubscription = this.firestoreService
        .getAuction(this.auctionId, currentUserID)
        .subscribe({
          next: (auction) => {
            if (auction) {
              this.auction = auction;
              if (auction.price) {
                this.calculateTotals(auction.price);
              }
              resolve();
            } else {
              this.handlingApplication = true;
              // Fallback to getApplication
              this.auctionSubscription = this.firestoreService
                .getApplication(this.auctionId!, )
                .subscribe({
                  next: (application) => {
                    if (application) {
                      this.auction = application;
                      if (application.price) {
                        this.calculateTotals(application.price);
                      }
                      resolve();
                    } else {
                      reject('Neither auction nor application found.');
                    }
                  },
                  error: (err) => {
                    console.error('Error fetching application:', err);
                    reject(err);
                  },
                });
            }
          },
          error: (err) => {
            console.error('Error fetching auction:', err);
            reject(err);
          },
        });
    });
  }

}
