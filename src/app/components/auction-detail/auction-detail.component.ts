import { Component } from '@angular/core';
import { Auction } from '../../models/auction';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { GalleriaModule } from 'primeng/galleria';
import { Dialog } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { AuctionService } from '../../services/auction.service';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-auction-detail',
  imports: [
    DatePipe,
    ButtonDirective,
    DecimalPipe,
    RouterLink,
    Ripple,
    GalleriaModule,
    Dialog,
    FormsModule,
    InputText,
    Toast,
  ],
  templateUrl: './auction-detail.component.html',
  styleUrl: './auction-detail.component.scss',
  providers: [MessageService],
})
export class AuctionDetailComponent {
  auction: Auction | null = null;
  auction$!: Observable<Auction | null>;

  bids: number = 21;
  displayBidDialog: boolean = false;
  bidAmount = 0;

  mainImage: string = '';

  thumbnailImages: string[] = [
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
    'placeholder.png',
  ];

  private countdownInterval?: number;

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private auctionService: AuctionService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      this.auction$ = this.storageService.getAuction(id);

      this.auction$.subscribe((auctionData) => {
        if (auctionData) {
          this.auction = auctionData;
          this.preloadAuctionImage(auctionData.imageUrl);
          this.startCountdown();
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  loadAuction(id: string) {
    this.auction$ = this.storageService.getAuction(id);
    console.log(this.auction$);
  }

  openBidding() {
    this.displayBidDialog = true;
  }

  async placeBid() {
    if (!this.auction || !this.auction.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Auction ID is missing',
      });
      return;
    }

    if (this.auction.endTimeDate < new Date()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Auction Expired',
        detail: 'Auction has ended.',
      });
      return;
    }

    if (this.bidAmount <= this.auction.price) {
      this.messageService.add({
        severity: 'error',
        summary: 'Outbid',
        detail: 'Bid too low.',
      });
      return;
    }

    try {
      await this.auctionService.addBid(
        this.auction.id,
        this.bidAmount,
        'testUser',
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Bid Placed',
        detail: `Bid successful`,
      });
      this.displayBidDialog = false; // Close the bid modal
    } catch (error) {
      console.error('Error placing bid:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to place bid. Please try again.',
      });
    }
  }

  private preloadAuctionImage(imageUrl: string | undefined) {
    if (!imageUrl) {
      console.error('No image URL provided.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      this.mainImage = imageUrl; // Update the main image after loading
      console.log('Image loaded:', imageUrl);
    };
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };
    img.src = imageUrl;
  }

  private startCountdown() {
    if (!this.auction) return;

    this.updateCountdown(); // Initial update

    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private updateCountdown() {
    if (!this.auction) return;

    const now = Date.now();
    const timeLeft = this.auction.endTimeDate.getTime() - now;

    if (timeLeft <= 0) {
      this.auction['countdown'] = 'Auction Ended';
      clearInterval(this.countdownInterval);
      return;
    }

    const days = Math.floor(timeLeft / 86400000); // 1000 * 60 * 60 * 24
    const hours = Math.floor((timeLeft % 86400000) / 3600000); // 1000 * 60 * 60
    const minutes = Math.floor((timeLeft % 3600000) / 60000); // 1000 * 60
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    if (days >= 1) {
      this.auction['countdown'] = `${days}d ${hours}h`;
    } else if (hours >= 1) {
      this.auction['countdown'] = `${hours}h ${minutes}m`;
    } else {
      this.auction['countdown'] = `${minutes}m ${seconds}s`;
    }
  }
}
