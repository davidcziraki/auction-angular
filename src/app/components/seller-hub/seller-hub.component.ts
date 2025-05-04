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
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { PaymentService } from '../../services/payment.service';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {Observable} from 'rxjs';
import {Router} from '@angular/router';

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
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
  ],
  templateUrl: './seller-hub.component.html',
  styleUrl: './seller-hub.component.scss',
  providers: [MessageService, DatePipe],
})
export class SellerHubComponent implements OnInit {
  authState$!: Observable<User | null>;
  user: User | null = null;

  tabValue: number = 0;
  carDetailsForm!: FormGroup;

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
    private paymentService: PaymentService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authState$ = this.authService.authState$;

    this.authState$.subscribe(async (user) => {
      if (user) {
        this.user = user;
        await this.loadAllAuctions();
        await this.handleStripeConnect();
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
      this.router.navigate(['cart', auctionId]);

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


  async handleStripeConnect() {
    const userAccountId = this.user?.uid;

    if (!userAccountId) {
      console.error('User account ID not found');
      return;
    }

    const userDetails = await this.firestoreService.getUserDetails(userAccountId);

    if (!userDetails) {
      console.error('User details not found');
      return;
    }

    const stripeAccountId = userDetails.stripe_id;

    if (!stripeAccountId) {
      console.log('Stripe account not found, starting onboarding process.');

      try {
        // Step 1: Create Stripe account
        const response = await this.paymentService.createStripeAccount().toPromise();

        if (!response) {
          throw new Error('No response from createStripeAccount');
        }

        const accountId = response.account;
        console.log('Stripe account created:', accountId);

        // Step 2: Create the account session to get ID
        const sessionResponse = await this.paymentService.createAccountSession(accountId).toPromise();
        console.log(sessionResponse)
        if (!sessionResponse) {
          throw new Error('No response from createAccountSession');
        }

        await this.firestoreService.saveStripeId(userAccountId, accountId);

        // Step 3: Initialize the Stripe Connect embedded onboarding flow
        const instance = loadConnectAndInitialize({
          publishableKey: 'pk_test_51Qz6yCKigABo6LYNncGHQE1npiAbeZXiVNm3WwYPVTI4A67o9rIgtalMkCLhgK0NLoniDRJHfjxNOgsDXMAo0wBr00asmo1tbC',
          fetchClientSecret: async () => {
            try {
              const fetchedClientSecret = await this.paymentService.fetchClientSecret(accountId);
              if (!fetchedClientSecret) {
                throw new Error('Failed to fetch client secret');
              }
              return fetchedClientSecret;
            } catch (error) {
              console.error('Error during fetchClientSecret:', error);
              return ''; // Return empty string or handle accordingly
            }
          },
          appearance: {
            overlays: 'drawer',
            variables: {
              colorPrimary: '#1f2c51',
              fontFamily: "Inter",
            },
          },
        });

        // Step 4: Append the onboarding component to the container
        const container = document.getElementById('embedded-onboarding-container');
        const embeddedOnboardingComponent = instance.create('account-onboarding');

        embeddedOnboardingComponent.setOnExit(() => {
          const balancesComponent = instance.create('balances');
          const balancesContainer = document.getElementById('balances-container');
          balancesContainer?.appendChild(balancesComponent);

          console.log('User exited the onboarding flow');
        });

        container?.appendChild(embeddedOnboardingComponent);

      } catch (error) {
        console.error('Error creating Stripe connected account:', error);
      }
    } else {
      console.log('Stripe account already connected, showing balance.');

      // Step 5: If user already has a stripe ID, show the balance component
      const instance = loadConnectAndInitialize({
        publishableKey: 'pk_test_51Qz6yCKigABo6LYNncGHQE1npiAbeZXiVNm3WwYPVTI4A67o9rIgtalMkCLhgK0NLoniDRJHfjxNOgsDXMAo0wBr00asmo1tbC',
        fetchClientSecret: async () => {
          try {
            const fetchedClientSecret = await this.paymentService.fetchClientSecret(stripeAccountId);
            if (!fetchedClientSecret) {
              throw new Error('Failed to fetch client secret');
            }
            return fetchedClientSecret;
          } catch (error) {
            console.error('Error during fetchClientSecret:', error);
            return ''; // Handle accordingly
          }
        },
        appearance: {
          overlays: 'drawer',
          variables: {
            colorPrimary: '#1f2c51',
            fontFamily: "Inter",
          },
        },
      });
      const notificationBanner = instance.create('notification-banner');
      const notificationContainer = document.getElementById('notification-banner-container');
      notificationContainer?.appendChild(notificationBanner);

      const balancesComponent = instance.create('balances');
      const balancesContainer = document.getElementById('balances-container');
      balancesContainer?.appendChild(balancesComponent);

      const payments = instance.create('payments');
      const paymentsContainer = document.getElementById('payments-container');
      paymentsContainer?.appendChild(payments);
    }
  }


}
