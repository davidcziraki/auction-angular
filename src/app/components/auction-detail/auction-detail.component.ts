import { Component } from '@angular/core';
import { Auction } from '../../models/auction';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { GalleriaModule } from 'primeng/galleria';

@Component({
  selector: 'app-auction-detail',
  imports: [
    DatePipe,
    ButtonDirective,
    DecimalPipe,
    RouterLink,
    Ripple,
    GalleriaModule,
  ],
  templateUrl: './auction-detail.component.html',
  styleUrl: './auction-detail.component.scss',
})
export class AuctionDetailComponent {
  auction: Auction | null = null;
  bids: number = 21;

  mainImage: string = 'test.jpg';

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
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(async (params) => {
      const id = params['id'];
      await this.loadAuction(id);
      this.startCountdown();
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  async loadAuction(id: string) {
    try {
      this.auction = await this.storageService.getAuction(id);
    } catch (error) {
      console.error('Error loading auction:', error);
    }
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
