import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auction } from '../../models/auction';
import { DecimalPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { StorageService } from '../../services/storage.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProgressSpinner } from 'primeng/progressspinner';
import { FirestoreService } from '../../services/firestore.service';
import { Toast } from 'primeng/toast';
import { MessageService, SelectItem } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { getAuth, User } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelect } from 'primeng/multiselect';
import { Slider } from 'primeng/slider';
import { InputText } from 'primeng/inputtext';
import { Chip } from 'primeng/chip';
import { Button, ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-search',
  imports: [
    NgForOf,
    NgIf,
    RouterLink,
    ProgressSpinner,
    Toast,
    NgClass,
    FormsModule,
    DropdownModule,
    MultiSelect,
    Slider,
    InputText,
    DecimalPipe,
    Chip,
    ButtonDirective,
    Button,
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  providers: [MessageService],
})
export class SearchComponent implements OnInit, OnDestroy {
  auctions: Auction[] = [];
  filteredAuctions: Auction[] = [];
  loadedImages: Set<string> = new Set();
  user: User | null = null;
  authState$!: Observable<User | null>;
  isLoading: boolean = false;

  searchInput: string = '';
  searchQuery: string = '';
  searchApplied: boolean = false;

  // Sort options
  sortOptions: SelectItem[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Ending Soonest', value: 'ending_soonest' },
  ];

  selectedSort: string = 'newest';
  // Make filter
  uniqueMakes: SelectItem[] = [
    { label: 'Ford', value: 'Ford' },
    { label: 'Toyota', value: 'Toyota' },
    { label: 'BMW', value: 'BMW' },
    { label: 'Mercedes-Benz', value: 'Mercedes-Benz' },
    { label: 'Audi', value: 'Audi' },
    { label: 'Volkswagen', value: 'Volkswagen' },
  ];
  selectedMakes: string[] = [];
  // Price range
  minPrice: number = 0;
  maxPrice: number = 100000000;
  priceRange: number[] = [0, 100000000];
  initialPriceRange: number[] = [0, 100000000];
  private countdownInterval?: number;

  constructor(
    private storageService: StorageService,
    private firestoreService: FirestoreService,
    private authService: AuthService,
    private messageService: MessageService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.authState$ = this.authService.authState$;
    this.authState$.subscribe(async (user) => {
      this.user = user;
      await this.loadAuctions(user?.uid);
    });
    this.initializeFilters();
    this.route.queryParams.subscribe((params) => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.searchInput = params['q']; // Ensure input field is populated
        this.applySearch(); // Run the search when navigating with a query
      }
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  applySearch() {
    this.searchQuery = this.searchInput.trim();
    if (this.searchQuery) {
      this.searchApplied = true;
      this.filterAuctions();
    }
  }

  clearSearch() {
    this.searchInput = '';
    this.searchQuery = '';
    this.searchApplied = false;
    this.filterAuctions();
  }

  initializeFilters(): void {
    // This would typically be populated from actual data
    // For example, getting min/max prices from your data service
    this.minPrice = 0;
    this.maxPrice = 100000000;
    this.priceRange = [this.minPrice, this.maxPrice];
    this.initialPriceRange = [this.minPrice, this.maxPrice];
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery !== '' ||
      this.selectedMakes.length > 0 ||
      this.isPriceRangeFiltered()
    );
  }

  isPriceRangeFiltered(): boolean {
    return (
      this.priceRange[0] !== this.initialPriceRange[0] ||
      this.priceRange[1] !== this.initialPriceRange[1]
    );
  }

  removeMake(make: string): void {
    this.selectedMakes = this.selectedMakes.filter((m) => m !== make);
    this.filterAuctions();
  }

  resetPriceRange(): void {
    this.priceRange = [...this.initialPriceRange];
    this.filterAuctions();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedMakes = [];
    this.priceRange = [...this.initialPriceRange];
    this.selectedSort = 'newest';
    this.filterAuctions();
  }

  async loadAuctions(userId?: string) {
    try {
      this.isLoading = true;

      // Fetch auctions with or without user ID
      this.auctions = await this.firestoreService.getAuctions(userId);
      this.filteredAuctions = [...this.auctions];

      // Set up price range for filtering
      this.minPrice = Math.min(...this.auctions.map((a) => a.price));
      this.maxPrice = Math.max(...this.auctions.map((a) => a.price));
      this.priceRange = [this.minPrice, this.maxPrice];

      // Extract unique makes for filtering dropdown
      this.uniqueMakes = [...new Set(this.auctions.map((a) => a.make))].map(
        (make) => ({ label: make, value: make }),
      );

      // Preload images asynchronously
      await Promise.all(
        this.auctions.map(
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

      // Start countdown timers for auctions
      this.startGlobalCountdown();

      // Sort auctions after loading
      this.sortAuctions();
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      this.isLoading = false;
    }
  }

  filterAuctions() {
    this.filteredAuctions = this.auctions.filter((auction) => {
      const matchesSearch =
        auction.make.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        auction.model.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        auction.year.toString().includes(this.searchQuery);

      const matchesMake =
        this.selectedMakes.length === 0 ||
        this.selectedMakes.includes(auction.make);

      const matchesPrice =
        auction.price >= this.priceRange[0] &&
        auction.price <= this.priceRange[1];

      return matchesSearch && matchesMake && matchesPrice;
    });

    this.sortAuctions();
  }

  sortAuctions() {
    this.filteredAuctions.sort((a, b) => {
      switch (this.selectedSort) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'newest':
          return b.year - a.year;
        case 'ending_soonest': // Sorting auctions by ending soonest
          return a.endTimeDate.getTime() - b.endTimeDate.getTime();
        default:
          return 0;
      }
    });
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
        severity: 'error',
        summary: 'Error',
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
