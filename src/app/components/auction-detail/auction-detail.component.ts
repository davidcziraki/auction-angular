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
import { getAuth } from '@angular/fire/auth';
import { FirestoreService } from '../../services/firestore.service';

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

  displayShareDialog: boolean = false;
  shareLink: string = '';

  bids: number = 0;
  displayBidDialog: boolean = false;
  bidAmount = 0;

  displayCalendarDialog: boolean = false;

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
    private firestoreService: FirestoreService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id: string | undefined = params['id'];

      if (!id) {
        console.error('Auction ID is undefined.');
        return;
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentUserID = currentUser?.uid ?? '';

      this.auction$ = this.firestoreService.getAuction(id, currentUserID);

      this.auction$.subscribe((auctionData) => {
        if (auctionData) {
          this.auction = auctionData;
          this.bids = auctionData.bidCount || 0; // Update bid count

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
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const currentUserID = currentUser?.uid as string;

    this.auction$ = this.firestoreService.getAuction(id, currentUserID);

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
      `Reminder: Auction for ${this.auction.name}`,
    );
    const endTime = new Date(this.auction.endTimeDate).getTime();

    // Calculate 2 hours before the auction ends
    const startDate = new Date(endTime - 7200000)
      .toISOString()
      .replace(/-|:|\.\d+/g, '');

    // The actual auction end time
    const endDate = new Date(endTime).toISOString().replace(/-|:|\.\d+/g, '');

    const details = encodeURIComponent(
      `The auction for ${this.auction.name} is ending soon! Current bid: HUF ${this.auction.price}.`,
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

    const title = `Reminder: Auction for ${this.auction.name}`;
    const endDate = new Date(this.auction.endTimeDate);
    const startDate = new Date(endDate.getTime() - 7200000);

    const location = 'CarLicit';
    const description = `The auction for ${this.auction.name} is ending soon. Current bid: HUF ${this.auction.price}.`;

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
