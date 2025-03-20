import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../../services/firestore.service';
import { Auction } from '../../models/auction';
import { getAuth } from '@angular/fire/auth';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-cart',
  imports: [DatePipe, NgIf, DecimalPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  auctionId: string | null = null;
  auction: Auction | null = null;

  vatAmount: number = 0;
  shippingCost: number = 5000; // Flat shipping fee
  totalCost: number = 0;

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit() {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUserID = currentUser?.uid as string;

    this.auctionId = this.route.snapshot.paramMap.get('id');
    if (this.auctionId) {
      this.firestoreService
        .getAuction(this.auctionId, currentUserID)
        .subscribe((auction) => {
          this.auction = auction;

          if (this.auction?.price) {
            this.calculateTotals(this.auction.price);
          }
        });
    }
  }

  calculateTotals(price: number) {
    this.vatAmount = price * 0.27; // 27% VAT
    this.totalCost = price + this.vatAmount + this.shippingCost;
  }

  proceedToPayment() {
    console.log('Processing payment for:', this.auction);
  }
}
