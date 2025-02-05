import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auction } from '../../models/auction';
import { DatePipe, NgForOf, NgIf } from '@angular/common';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-search',
  imports: [NgForOf, DatePipe, NgIf],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit, OnDestroy {
  auctions: Auction[] = [];
  private countdownInterval?: number;

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.loadAuctions();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  async loadAuctions() {
    try {
      this.auctions = await this.storageService.loadAuctions();
      this.startGlobalCountdown();
    } catch (error) {
      console.error('Error loading auctions:', error);
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

      auction['countdown'] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    });
  }
}
