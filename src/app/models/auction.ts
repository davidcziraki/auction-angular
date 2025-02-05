import { Timestamp } from '@angular/fire/firestore';

export interface Auction {
  id?: string;
  name: string;
  price: number;
  endtime?: Timestamp;
  endTimeDate: Date;
  imageUrl?: string;
  countdown?: string;
}
