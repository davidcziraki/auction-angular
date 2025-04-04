import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputMask, InputMaskModule } from 'primeng/inputmask';
import { Checkbox } from 'primeng/checkbox';
import { Button, ButtonDirective } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { AuthService } from '../../services/auth.service';
import { User } from '@angular/fire/auth';
import { FirestoreService } from '../../services/firestore.service';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { DatePipe, formatCurrency, NgForOf, NgIf } from '@angular/common';
import { Auction } from '../../models/auction';
import { StorageService } from '../../services/storage.service';
import { Dialog } from 'primeng/dialog';
import { FileUpload } from 'primeng/fileupload';

@Component({
  selector: 'app-seller-hub',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputMask,
    InputMaskModule,
    Checkbox,
    ButtonDirective,
    DropdownModule,
    FormsModule,
    DatePicker,
    Select,
    Textarea,
    Toast,
    TableModule,
    NgIf,
    Button,
    NgForOf,
    Dialog,
    FileUpload,
  ],
  templateUrl: './seller-hub.component.html',
  styleUrl: './seller-hub.component.scss',
  providers: [MessageService, DatePipe],
})
export class SellerHubComponent implements OnInit {
  carDetailsForm!: FormGroup;
  user: User | null = null;
  auctions: Auction[] = [];
  isNewApplication: boolean = true;

  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  mainImage: File | null = null;
  mainImageIndex: number | null = null;
  mainImagePreview: string | null = null;
  displayImagesModal: boolean = false;
  applicationImages: string[] = [];

  expandedRows: { [key: string]: boolean } = {};

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

  protected readonly formatCurrency = formatCurrency;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private messageService: MessageService,
    private datePipe: DatePipe,
    private storageService: StorageService,
  ) {}

  ngOnInit(): void {
    this.authService.authState$.subscribe(async (user) => {
      if (user) {
        this.user = user;
        await this.loadAllAuctions();
      } else {
        console.error('User is not authenticated');
      }
    });

    this.carDetailsForm = this.fb.group({
      mobile: [
        '',
        [Validators.required, Validators.pattern(/^\(07\) \d{4}-\d{5}$/)],
      ],
      isDealer: [false],
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.pattern(/^(19|20)\d{2}$/)]],
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],
      mileage: ['', [Validators.required, Validators.min(0)]],
      price: ['', [Validators.required, Validators.min(1)]],
      registration: ['', Validators.required],
      endDate: ['', Validators.required],
      colour: ['', Validators.required],
      description: ['', Validators.required],
    });
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

  // Function to submit the auction data
  async submitApplication() {
    if (this.carDetailsForm.invalid) {
      return;
    }

    const formData = this.carDetailsForm.value;

    // Prepare the auction data to match Firestore model
    const auction: Auction = {
      mobile: formData.mobile,
      isDealer: formData.isDealer,
      make: formData.make,
      model: formData.model,
      year: formData.year,
      transmission: formData.transmission,
      fuel: formData.fuel,
      mileage: formData.mileage,
      price: formData.price,
      registration: formData.registration,
      endTimeDate: formData.endDate,
      endtime: formData.endDate,
      colour: formData.colour,
      description: formData.description,
      seller: this.user?.email || '',
      status: 'Pending',
      submissionDate: new Date(),
    };

    try {
      const auctionId = await this.firestoreService.submitAuction(auction);
      if (!auctionId) {
        throw new Error('Failed to create auction.');
      }

      let imageUrls: string[] = [];
      let mainImageUrl: string = '';

      if (this.mainImage) {
        mainImageUrl = await this.storageService.uploadMainImage(
          auctionId,
          this.mainImage,
        );
        imageUrls.push(mainImageUrl);
      }

      const otherImages = this.selectedImages.filter(
        (_, index) => index !== this.mainImageIndex,
      );
      if (otherImages.length > 0) {
        const otherImageUrls = await this.storageService.uploadImages(
          auctionId,
          otherImages,
        );
        imageUrls.push(...otherImageUrls);
      }

      await this.firestoreService.updateApplication(auctionId, {
        imageUrls: imageUrls,
        mainImageUrl: mainImageUrl || undefined,
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Application submitted successfully.',
      });

      await this.loadAllAuctions();
      this.clearForm();
    } catch (error) {
      console.error('Error submitting auction:', error);
    }
  }

  // Method to clear the form after submission
  clearForm() {
    // Reset the form
    this.carDetailsForm.reset();

    // Clear image-related variables
    this.selectedImages = [];
    this.imagePreviews = [];
    this.mainImage = null;
    this.mainImagePreview = null;
  }

  toggleButton(isNewApplication: boolean) {
    this.isNewApplication = isNewApplication;
  }

  async loadAllAuctions(): Promise<void> {
    try {
      if (!this.user?.email) {
        console.error('No user email found');
        return;
      }

      this.auctions = await this.firestoreService.getApplicationsSeller(
        this.user.email,
      );

      console.log('Loaded auctions:', this.auctions);
    } catch (error) {
      console.error('Error loading seller applications and auctions:', error);
    }
  }

  // Handle opening the image modal with selected images
  openImagesModal(images: string[]): void {
    this.applicationImages = images; // Store the images to display
    this.displayImagesModal = true; // Show the modal
  }

  getSeverity(
    status: string,
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'help'
    | 'primary'
    | 'secondary'
    | 'contrast'
    | null {
    switch (status) {
      case 'Active':
        return 'success';
      case 'expired':
        return 'warn';
      case 'Pending':
        return 'secondary';
      default:
        return 'danger';
    }
  }
}
