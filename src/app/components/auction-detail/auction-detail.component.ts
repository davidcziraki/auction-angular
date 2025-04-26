import { Component } from '@angular/core';
import { Auction } from '../../models/auction';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GalleriaModule } from 'primeng/galleria';
import { FormsModule } from '@angular/forms';
import { AuctionService } from '../../services/auction.service';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { getAuth } from '@angular/fire/auth';
import { FirestoreService } from '../../services/firestore.service';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-auction-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    GalleriaModule,
    FormsModule,
    Toast,
    Dialog,
    InputText,
    ButtonDirective,
    RouterLink,
  ],
  templateUrl: './auction-detail.component.html',
  styleUrl: './auction-detail.component.scss',
  providers: [MessageService],
})
export class AuctionDetailComponent {
  auction: Auction | null = null;
  auctions: Auction[] = [];

  auction$!: Observable<Auction | null>;
  vehicleDetails: any;
  currentUser: any;

  activeTab = 'details';

  displayShareDialog: boolean = false;
  shareLink: string = '';

  bids: number = 0;
  displayBidDialog: boolean = false;
  bidAmount: number = 0;
  minBid: number = 0;
  bidError: string = '';
  canPlaceBid: boolean = true;
  minBidIncreasePercentage: number = 5;

  displayCalendarDialog: boolean = false;
  biddingSectionVisible = false;

  mainImage: string = '';
  images: any[] = [];
  responsiveOptions: any[] = [
    {
      breakpoint: '1300px',
      numVisible: 4,
    },
    {
      breakpoint: '575px',
      numVisible: 6,
    },
  ];

  private countdownInterval?: number;

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private auctionService: AuctionService,
    private messageService: MessageService,
    private firestoreService: FirestoreService,
  ) {}

  get isBidValid(): boolean {
    return this.bidAmount >= this.minBid;
  }

  trackTab(index: number, tab: any): any {
    return tab.value;
  }

  // This method toggles the visibility of the bidding section
  toggleBiddingSection() {
    if (!this.biddingSectionVisible) {
      // When showing the form, we allow the user to start bidding
      this.biddingSectionVisible = true;
      this.canPlaceBid = true; // Enable the bid button when the form is shown
    } else {
      // If the bidding section is visible, place the bid
      this.validateBid();
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    this.route.params.subscribe((params) => {
      const id: string | undefined = params['id'];

      if (!id) {
        console.error('Auction ID is undefined.');
        return;
      }

      const auth = getAuth();
      this.currentUser = auth.currentUser;

      const currentUserID = this.currentUser?.uid; // Safe regardless of login

      // Always load auction suggestions (filtered if user is logged in)
      this.loadAuctions(currentUserID, id);

      // Load auction details only if user is signed in
      this.auction$ = this.firestoreService.getAuction(id, currentUserID || '');

      this.auction$.subscribe((auctionData) => {
        if (auctionData) {
          this.auction = auctionData;

          this.minBid =
            this.auction.price * (1 + this.minBidIncreasePercentage / 100);
          this.bids = auctionData.bidCount || 0;

          this.preloadAuctionImage(auctionData.mainImageUrl);
          this.setUpImages(auctionData);
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

  // Set up images for Galleria
  setUpImages(auctionData: Auction) {
    // Ensure that imageUrls exists and is an array
    const imageUrls = auctionData.imageUrls ?? [];

    // Initialize the images array with only the imageUrls
    this.images = imageUrls.map((imageUrl: string) => ({
      itemImageSrc: imageUrl,
      thumbnailImageSrc: imageUrl,
    }));
  }

  validateBid() {
    if (!Number.isInteger(this.bidAmount)) {
      this.bidError = 'Bids must be whole numbers (no decimals allowed).';
      this.canPlaceBid = false;
      return;
    }

    if (this.bidAmount < this.minBid) {
      this.bidError = `Your bid must be at least HUF ${this.minBid.toFixed(0)} (${this.minBidIncreasePercentage}% higher).`;
      this.canPlaceBid = false;
      return;
    }

    this.bidAmount = Math.floor(this.bidAmount); // Ensure the bid is an integer
    this.bidError = '';
    this.canPlaceBid = true;

    // If everything is valid, call placeBid()
    this.placeBid();
  }

  loadAuction(id: string) {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUserID = currentUser?.uid as string;

    this.auction$ = this.firestoreService.getAuction(id, currentUserID);
  }

  async loadAuctions(userId?: string, currentAuctionId?: string) {
    try {
      // Fetch all auctions with additional data
      const allAuctions = await this.firestoreService.getAuctions(userId);

      // Filter out auctions that are not active and not the current one
      const activeAuctions = allAuctions.filter(
        (a) =>
          a.status?.toLowerCase() === 'active' && a.id !== currentAuctionId,
      );

      // Shuffle the array randomly
      const shuffled = activeAuctions.sort(() => Math.random() - 0.5);

      // Pick 3 random auctions
      this.auctions = shuffled.slice(0, 3);

      // Start countdown timers
      this.startGlobalCountdown();
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
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
        summary: 'Error',
        detail: 'Bid too low.',
      });
      return;
    }

    // Get current authenticated user
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'You must be logged in to place a bid.',
      });
      return;
    }

    try {
      await this.auctionService.addBid(
        this.auction.id,
        this.bidAmount,
        currentUser.uid,
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Bid Placed',
        detail: 'Bid successful',
      });

      this.displayBidDialog = false; // Close the bid modal
    } catch (error) {
      console.error('Error placing bid:', error);

      let errorMessage = 'Failed to place bid. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    }
  }

  /** Add or remove auction from favourites */
  async toggleFavourite(auction: Auction | null) {
    if (!auction) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Auction is null.',
      });
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user?.uid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'User not logged in.',
      });
      return;
    }

    try {
      await this.firestoreService.toggleFavourites(user.uid, auction.id!);
      auction.isFavourite = !auction.isFavourite;

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: auction.isFavourite
          ? 'Added to favourites'
          : 'Removed from favourites',
      });
    } catch (error) {
      console.error('Error toggling favourite:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update favourites.',
      });
    }
  }

  openShareModal() {
    this.shareLink = window.location.href; // Get the current auction URL
    this.displayShareDialog = true;
  }

  shareOnFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareLink)}`;
    window.open(url, '_blank');
  }

  shareOnTwitter() {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.shareLink)}&text=Check%20out%20this%20auction!`;
    window.open(url, '_blank');
  }

  shareOnWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent('Check out this auction: ' + this.shareLink)}`;
    window.open(url, '_blank');
  }

  copyToClipboard() {
    navigator.clipboard
      .writeText(this.shareLink)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied!',
          detail: 'Auction link copied to clipboard.',
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to copy link.',
        });
      });
  }

  openCalendarModal() {
    this.displayCalendarDialog = true;
  }

  addToGoogleCalendar() {
    if (!this.auction) return;

    const title = encodeURIComponent(
      `Reminder: Auction for ${this.auction.year} ${this.auction.make} ${this.auction.model}`,
    );
    const endTime = new Date(this.auction.endTimeDate).getTime();

    // Calculate 2 hours before the auction ends
    const startDate = new Date(endTime - 7200000)
      .toISOString()
      .replace(/-|:|\.\d+/g, '');

    // The actual auction end time
    const endDate = new Date(endTime).toISOString().replace(/-|:|\.\d+/g, '');

    const details = encodeURIComponent(
      `The auction for ${this.auction.year} ${this.auction.make} ${this.auction.model} is ending soon! Current bid: HUF ${this.auction.price}.`,
    );

    const location = encodeURIComponent('CarLicit');

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;

    window.open(url, '_blank');
    this.displayCalendarDialog = false; // Close modal after action
  }

  addToOutlookCalendar() {
    this.addToCalendar(); // Uses ICS method
    this.displayCalendarDialog = false;
  }

  addToCalendar() {
    if (!this.auction) return;

    const title = `Reminder: Auction for ${this.auction.year} ${this.auction.make} ${this.auction.model}`;
    const endDate = new Date(this.auction.endTimeDate);
    const startDate = new Date(endDate.getTime() - 7200000);

    const location = 'CarLicit';
    const description = `The auction for ${this.auction.year} ${this.auction.make} ${this.auction.model} is ending soon. Current bid: HUF ${this.auction.price}.`;

    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const dtStamp = formatDate(new Date());
    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Auction Calendar//EN
BEGIN:VEVENT
UID:${new Date().getTime()}@auction-site.com
DTSTAMP:${dtStamp}
DTSTART:${startFormatted}
DTEND:${endFormatted}
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auction-event.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.displayCalendarDialog = false;
  }

  setAutoBid(percentage: number) {
    if (this.auction?.price) {
      const increase = Math.ceil(this.auction.price * (percentage / 100));
      this.bidAmount = this.auction.price + increase;
    }
  }

  calcAutoBid(percentage: number): number {
    return this.auction?.price
      ? Math.ceil(this.auction.price * (percentage / 100))
      : 0;
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

  private startGlobalCountdown() {
    // Initial update
    this.updateAllCountdowns();

    // Single interval for all auctions
    this.countdownInterval = window.setInterval(() => {
      this.updateAllCountdowns();
    }, 1000);
  }

  private updateAllCountdowns() {
    const now = Date.now(); // Get current timestamp once

    this.auctions.forEach((auction) => {
      const timeLeft = auction.endTimeDate.getTime() - now;

      if (timeLeft <= 0) {
        auction['countdown'] = 'Auction Ended';
        return;
      }

      // More efficient time calculations using division and modulo
      const days = Math.floor(timeLeft / 86400000); // 1000 * 60 * 60 * 24
      const hours = Math.floor((timeLeft % 86400000) / 3600000); // 1000 * 60 * 60
      const minutes = Math.floor((timeLeft % 3600000) / 60000); // 1000 * 60
      const seconds = Math.floor((timeLeft % 60000) / 1000);

      if (days >= 1) {
        auction['countdown'] = `${days}d ${hours}h`;
      } else if (hours >= 1) {
        auction['countdown'] = `${hours}h ${minutes}m`;
      } else {
        auction['countdown'] = `${minutes}m ${seconds}s`;
      }
    });
  }
}
