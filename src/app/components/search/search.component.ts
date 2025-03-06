import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auction } from '../../models/auction';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { RouterLink } from '@angular/router';
import { ProgressSpinner } from 'primeng/progressspinner';
import { FirestoreService } from '../../services/firestore.service';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { getAuth, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [NgForOf, NgIf, RouterLink, ProgressSpinner, Toast, NgClass],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  providers: [MessageService],
})
export class SearchComponent implements OnInit, OnDestroy {
  auctions: Auction[] = [];
  user: User | null = null;
  authState$!: Observable<User | null>;

  loadedImages: Set<string> = new Set();
  isLoading: boolean = false;
  private countdownInterval?: number;

  constructor(
    private storageService: StorageService,
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.authState$ = this.authService.authState$;

    this.authState$.subscribe(async (user) => {
      this.user = user;

      await this.loadAuctions(user?.uid);
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  async loadAuctions(userId?: string) {
    try {
      this.isLoading = true;

      // Fetch auctions with or without user ID
      const auctionData = await this.firestoreService.getAuctions(userId);

      // Preload images
      await Promise.all(
        auctionData.map(
          (auction) =>
            new Promise<void>((resolve) => {
              if (!auction.imageUrl) {
                resolve();
                return;
              }

              const img = new Image();
              img.onload = () => {
                this.loadedImages.add(auction.id!);
                resolve();
              };
              img.onerror = () => {
                console.error(`Failed to load image for auction ${auction.id}`);
                resolve();
              };
              img.src = auction.imageUrl;
            }),
        ),
      );

      this.auctions = auctionData;
      this.startGlobalCountdown();
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  isImageLoaded(auctionId: string): boolean {
    return this.loadedImages.has(auctionId);
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
