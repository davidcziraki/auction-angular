import { Component, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { NgForOf, NgIf } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';
import {Badge} from 'primeng/badge';

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
    NgForOf,
    ReactiveFormsModule,
    Select,
    Toast,
    Badge,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  providers: [MessageService],
})
export class AdminComponent implements OnInit {
  // NEW AUCTION
  newAuctionDialog = false;
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  mainImage: File | null = null;
  mainImageIndex: number | null = null;
  mainImagePreview: string | null = null;

  transmissionOptions = [
    { label: 'Manual', value: 'Manual' },
    { label: 'Automatic', value: 'Automatic' },
  ];

  fuelTypeOptions = [
    { label: 'Petrol', value: 'Petrol' },
    { label: 'Diesel', value: 'Diesel' },
    { label: 'Electric', value: 'Electric' },
    { label: 'Hybrid', value: 'Hybrid' },
  ];

  newAuction: Auction = {
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(), // Default to current year
    seller: '',
    endTimeDate: new Date(),
    price: 0,
    mileage: 0,
    transmission: '',
    colour: '',
    fuel: '',
    status: 'active',
  };

  selectedAuction: Auction = {
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    seller: '',
    endtime: Timestamp.now(),
    endTimeDate: new Date(),
    price: 0,
    mileage: 0,
    transmission: '',
    colour: '',
    fuel: '',
    status: 'active',
  };

  ///////////////////
  auctions!: Auction[];
  filteredAuctions: Auction[] = [];
  selectedFilter: string = 'all';
  searchQuery: string = '';
  displayEditModal: boolean = false;
  displayApplicationsModal = false;
  displayImagesModal: boolean = false;
  applicationImages: string[] = [];

  public newTheme = themeAlpine.withPart(colorSchemeDarkBlue);

  paginationPageSize = 10;
  paginationPageSizeSelector: number[] | boolean = [10, 25, 50];

  colDefs: ColDef[] = [
    {
      field: 'mainImageUrl',
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
      registration: '',
      make: '',
      model: '',
      year: new Date().getFullYear(), // Default to current year
      seller: '',
      endTimeDate: new Date(),
      price: 0,
      mileage: 0,
      transmission: '',
      colour: '',
      fuel: '',
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
    // Validate required fields
    if (
      !this.newAuction.registration ||
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

    try {
      // Add the auction to Firestore and get the auction ID
      const auctionId = await this.firestoreService.addAuction(this.newAuction);
      if (!auctionId) {
        throw new Error('Failed to create auction.');
      }

      // Initialize variables for storing the URLs
      let imageUrls: string[] = [];
      let mainImageUrl: string = ''; // Initialize to an empty string to avoid null assignment

      // Handle image uploads
      if (this.selectedImages.length > 0) {
        // If a main image has been selected, upload it first
        if (this.mainImage) {
          mainImageUrl = await this.storageService.uploadMainImage(
            auctionId,
            this.mainImage,
          ); // Upload main image
        }

        // Upload other images and get their URLs
        const otherImageUrls = await this.storageService.uploadImages(
          auctionId,
          this.selectedImages.filter(
            (_, index) => index !== this.mainImageIndex,
          ), // Exclude the main image from other images
        );

        // Combine the main image URL with other image URLs
        imageUrls = [mainImageUrl, ...otherImageUrls];

        // Update the auction document with image URLs and the main image URL
        await this.firestoreService.updateAuction(auctionId, {
          imageUrls: imageUrls,
          mainImageUrl: mainImageUrl, // Store the main image URL
        });
      }

      // Close the dialog and refresh the auction list
      this.newAuctionDialog = false;
      this.fetchAuctions(); // Refresh the auction list after creation
    } catch (error) {
      console.error('Error creating auction:', error);
    }
  }

  // Handle image selection and generate previews
  onImagesSelected(event: any) {
    this.selectedImages = Array.from(event.files);
    const imagePreviewPromises = this.selectedImages.map((file: File) => {
      const reader = new FileReader();
      return new Promise<string>((resolve) => {
        reader.onload = (e: any) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePreviewPromises).then((previews: string[]) => {
      this.imagePreviews = previews;
    });
  }

  // Handle the main image selection
  onMainImageSelected(event: any) {
    const file = event.files[0];
    this.mainImage = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.mainImagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
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

      // Check if there are selected images to upload
      if (this.selectedImages && this.selectedImages.length > 0) {
        // Upload images and get their URLs
        updates.imageUrls = await this.storageService.uploadImages(
          this.selectedAuction.id,
          this.selectedImages,
        );
      }

      // Check if a new main image is selected
      if (this.mainImage) {
        // Upload the main image and get its URL
        updates.mainImageUrl = await this.storageService.uploadMainImage(
          this.selectedAuction.id,
          this.mainImage, // Upload the selected main image
        );
      }

      // Update the auction in Firestore with the new data
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
      await this.fetchAuctions(); // Refresh the auctions list after updating
    } catch (error) {
      console.error('Error updating auction:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update auction!',
      });
    }
  }

  async viewApplications() {
    try {
      this.auctions = await this.firestoreService.getApplicationsAdmin(); // Fetch applications
      this.displayApplicationsModal = true; // Open the modal
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  }

  async approveApplication(application: any) {
    try {
      await this.firestoreService.approveApplication(application.id); // Using application.id
      console.log('Application approved:', application.id);
      await this.viewApplications();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Application approved successfully',
      });
    } catch (error) {
      console.error('Error approving application:', error);
    }
  }

  async rejectApplication(application: any) {
    try {
      await this.firestoreService.denyApplication(application.id); // Using application.id
      console.log('Application rejected:', application.id);
      await this.viewApplications();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Application rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting application:', error);
    }
  }

  // Handle opening the image modal with selected images
  openImagesModal(images: string[]): void {
    this.applicationImages = images; // Store the images to display
    this.displayImagesModal = true; // Show the modal
  }
}
