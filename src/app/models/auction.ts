import { Timestamp } from '@angular/fire/firestore';

export interface Auction {
  id?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  endtime?: Timestamp;
  endTimeDate: Date;
  imageUrl?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
  seller: string;
  status: string;
  countdown?: string;
  winnerID?: string;
  isFavourite?: boolean;
  isPopular?: boolean;
  isEndingSoon?: boolean;
  bidCount?: number;
  description?: string;
  bodyStyle?: string;
  engineSize?: string;
  numberOfDoors?: number;
  numberOfSeats?: number;
  insuranceGroup?: number;
  registration: string;
  mileage: number;
  transmission: string;
  colour: string;
  fuel: string;
  isDealer?: boolean;
  mobile?: number;
  submissionDate?: Date;
}
