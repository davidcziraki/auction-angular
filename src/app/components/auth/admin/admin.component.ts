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
    make: '',
    model: '',
    year: new Date().getFullYear(), // Default to current year
    seller: '',
    endTimeDate: new Date(),
    price: 0,
    status: 'active',
  };

  selectedAuction: Auction = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
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
        return `<img src="${params.value}" width="250" height="160" style="border-radius: 10px;" alt="">`;
      },
      autoHeight: true,
      width: 300,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    },
    { field: 'make', headerName: 'Make', filter: true },
    { field: 'model', headerName: 'Model', filter: true },
    { field: 'year', headerName: 'Year', filter: true },
    {
      field: 'price',
      headerName: 'Price (HUF)',
      valueFormatter: (params) =>
        new Intl.NumberFormat('hu-HU', {
          style: 'currency',
          currency: 'HUF',
        }).format(params.value),
      cellStyle: { textAlign: 'right' },
    },
    { field: 'seller', headerName: 'Seller', filter: true },

    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: (params: { value: string }) => {
        let color =
          params.value.toLowerCase() === 'completed'
            ? 'green'
            : params.value.toLowerCase() === 'expired'
              ? 'orange'
              : 'gray';

        return `<span style="background:${color}; color: white; padding: 5px 10px; border-radius: 10px;">${params.value}</span>`;
      },
      cellStyle: { display: 'flex', alignItems: 'center' },
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
      onCellClicked: (params: any) => {
        if (params.event.target.classList.contains('delete-auction')) {
          this.onDeleteAuction(params.data);
        }
        if (params.event.target.classList.contains('edit-auction')) {
          this.openEditModal(params.data);
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
      this.auctions = await this.firestoreService.getAuctions();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
  }

  filterStatus(status: string) {
    this.selectedFilter = status; // No need for mapping if DB stores exact values
    this.applyFilters();
  }

  applyFilters() {
    this.filteredAuctions = this.auctions.filter((auction) => {
      const matchesStatus =
        this.selectedFilter === 'all' ||
        auction.status.toLowerCase() === this.selectedFilter;
      const matchesSearch =
        auction.make.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        auction.model.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        auction.year.toString().includes(this.searchQuery);

      return matchesStatus && matchesSearch;
    });
  }

  openNewAuctionDialog() {
    this.newAuction = {
      make: '',
      model: '',
      year: new Date().getFullYear(), // Default to current year
      seller: '',
      endTimeDate: new Date(),
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
      !this.newAuction.make ||
      !this.newAuction.model ||
      !this.newAuction.year ||
      !this.newAuction.seller ||
      !this.newAuction.endTimeDate ||
      !this.newAuction.price
    ) {
      alert('Please fill in all fields.');
      return;
    }

    this.newAuction.endtime = Timestamp.fromDate(this.newAuction.endTimeDate);

    try {
      const auctionId = await this.firestoreService.addAuction(this.newAuction);
      if (!auctionId) {
        throw new Error('Failed to create auction.');
      }

      if (this.selectedImage) {
        const imageUrl = await this.storageService.uploadImage(
          auctionId,
          this.selectedImage,
        );
        if (imageUrl) {
          await this.firestoreService.updateAuction(auctionId, { imageUrl });
        }
      }

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
        await this.firestoreService.deleteAuction(auction.id);
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
    if (!this.selectedAuction || !this.selectedAuction.id) return;

    try {
      const updates: Partial<Auction> = { ...this.selectedAuction };

      if (this.selectedImage) {
        updates.imageUrl = await this.storageService.uploadImage(
          this.selectedAuction.id,
          this.selectedImage,
        );
      }

      await this.firestoreService.updateAuction(
        this.selectedAuction.id,
        updates,
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Auction updated successfully!',
      });

      this.displayEditModal = false;
      await this.fetchAuctions();
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
