import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { Auction } from '../../../models/auction';
import { StorageService } from '../../../services/storage.service';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, colorSchemeDarkBlue, themeAlpine } from 'ag-grid-community';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { FirestoreService } from '../../../services/firestore.service';
import { Timestamp } from '@angular/fire/firestore';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { NgIf } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-admin',
  imports: [
    TableModule,
    FormsModule,
    DropdownModule,
    AgGridAngular,
    Button,
    Dialog,
    InputText,
    FileUpload,
    FileUploadModule,
    NgIf,
    DatePickerModule,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  providers: [MessageService],
})
export class AdminComponent implements OnInit {
  // NEW AUCTION
  newAuctionDialog = false;
  selectedImage: File | null = null;

  newAuction: Auction = {
    name: '',
    seller: '',
    endTimeDate: new Date(),
    price: 0,
    status: 'active',
  };

  selectedAuction: Auction = {
    name: '',
    seller: '',
    endtime: Timestamp.now(),
    endTimeDate: new Date(),
    price: 0,
    status: 'active',
  };

  ///////////////////
  auctions!: Auction[];
  filteredAuctions: Auction[] = [];
  selectedFilter: string = 'all';
  searchQuery: string = '';
  displayEditModal: boolean = false;

  public newTheme = themeAlpine.withPart(colorSchemeDarkBlue);

  paginationPageSize = 10;
  paginationPageSizeSelector: number[] | boolean = [10, 25, 50];

  colDefs: ColDef[] = [
    {
      field: 'imageUrl',
      headerName: 'Image',
      cellRenderer: (params: { value: any }) => {
        const imageUrl = params.value ? params.value : 'placeholder.png';
        return `<img src="${params.value}" width="250" height="160" style="border-radius: 10px; " alt="">`;
      },
      autoHeight: true,
      width: 300,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }, // Center image
    },
    {
      field: 'name',
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      field: 'seller',
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      field: 'endTimeDate',
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center' },
    },
    {
      field: 'price',
      filter: true,
      headerName: 'Price (HUF)',
      valueFormatter: (params) => {
        return new Intl.NumberFormat('hu-HU', {
          style: 'currency',
          currency: 'HUF',
        }).format(params.value);
      },
      cellStyle: { display: 'flex', alignItems: 'center', textAlign: 'right' }, // Aligns numbers & centers vertically
    },
    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return '';

        const capitalizedStatus =
          params.value.charAt(0).toUpperCase() +
          params.value.slice(1).toLowerCase();

        let color =
          capitalizedStatus === 'Completed'
            ? 'green'
            : capitalizedStatus === 'Paused'
              ? 'orange'
              : capitalizedStatus === 'Active'
                ? 'gray'
                : 'gray';

        return `<span style="background:${color}; color: white; padding: 5px 10px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">${capitalizedStatus}</span>`;
      },
      cellStyle: { display: 'flex', alignItems: 'center' }, // Ensures text inside the cell is centered
    },
    {
      field: 'actions',
      headerName: 'Actions',
      cellRenderer: (params: any) => {
        const auctionId = params.data.id;
        return `
        <button class="btn btn-primary edit-auction">Edit</button>
        <button class="btn btn-danger delete-auction" data-id="${auctionId}">Delete</button>
      `;
      },
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      onCellClicked: (params: any) => {
        if (params.event.target.classList.contains('delete-auction')) {
          const auction = params.data;
          if (auction) {
            this.onDeleteAuction(auction);
          }
        }
        if (params.event.target.classList.contains('edit-auction')) {
          const auction = params.data;
          if (auction) {
            this.openEditModal(auction);
          }
        }
      },
    },
  ];

  constructor(
    private storageService: StorageService,
    private firestoreService: FirestoreService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.fetchAuctions();
  }

  async fetchAuctions() {
    try {
      this.auctions = await this.storageService.loadAuctions();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
  }

  filterStatus(status: string) {
    this.selectedFilter = status; // No need for mapping if DB stores exact values
    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
  }

  applyFilters() {
    this.filteredAuctions = this.auctions.filter((auction) => {
      const matchesStatus =
        this.selectedFilter === 'all' ||
        auction.status.toLowerCase() === this.selectedFilter;
      const matchesSearch = auction.name
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }

  openNewAuctionDialog() {
    const now = Timestamp.now();

    this.newAuction = {
      name: '',
      seller: '',
      endtime: now,
      endTimeDate: now.toDate(),
      price: 0,
      status: 'active',
    };

    this.newAuctionDialog = true;
  }

  openEditModal(auction: Auction) {
    this.selectedAuction = { ...auction };

    if (this.selectedAuction.endtime instanceof Timestamp) {
      this.selectedAuction.endTimeDate = this.selectedAuction.endtime.toDate();
    }

    this.displayEditModal = true;
  }

  async createAuction() {
    if (
      !this.newAuction.name ||
      !this.newAuction.seller ||
      !this.newAuction.endTimeDate || // Use endTimeDate for validation
      !this.newAuction.price
    ) {
      alert('Please fill in all fields.');
      return;
    }

    this.newAuction.endtime = Timestamp.fromDate(this.newAuction.endTimeDate);

    try {
      await this.firestoreService.addAuction(
        this.newAuction,
        this.selectedImage || undefined,
      );
      this.newAuctionDialog = false;
      this.fetchAuctions(); // Refresh list
    } catch (error) {
      console.error('Error creating auction:', error);
    }
  }

  onImageSelected(event: any) {
    console.log('File selection event:', event);

    if (event.files && event.files.length > 0) {
      this.selectedImage = event.files[0]; // ✅ Store the file
      console.log('Selected file:', this.selectedImage);
    }
  }

  async onDeleteAuction(auction: Auction) {
    if (!auction.id) {
      console.error('Error: Auction ID is undefined.');
      return;
    }

    if (confirm('Are you sure you want to delete this auction?')) {
      try {
        await this.firestoreService.deleteAuction(auction); // Calls FirestoreService function
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Auction deleted successfully!',
        });

        this.fetchAuctions(); // Refresh list after deletion
      } catch (error) {
        console.error('Error deleting auction:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete auction!',
        });
      }
    }
  }

  async updateAuction() {
    if (!this.selectedAuction) return;

    try {
      await this.firestoreService.updateAuction(
        this.selectedAuction,
        this.selectedImage || undefined,
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Auction updated successfully!',
      });

      this.displayEditModal = false;
      this.fetchAuctions();
    } catch (error) {
      console.error('Error updating auction:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update auction!',
      });
    }
  }
}
