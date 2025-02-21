import { Component, OnInit } from '@angular/core';
import { TabPanel, TabView } from 'primeng/tabview';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import {
  collection,
  Firestore,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-account-manage',
  imports: [TabView, TabPanel, Button, TableModule, CurrencyPipe, DatePipe],
  templateUrl: './account-manage.component.html',
  styleUrl: './account-manage.component.scss',
})
export class AccountManageComponent implements OnInit {
  wonAuctions: any[] = [];
  authState$!: Observable<User | null>;
  user: User | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
  ) {
    this.authState$ = this.authService.authState$;

    this.authState$.subscribe((user) => {
      this.user = user;
    });
  }

  async ngOnInit() {
    this.authState$.subscribe(async (user) => {
      if (user) {
        this.user = user;

        const auctionsRef = collection(this.firestore, 'auctions');
        const q = query(auctionsRef, where('winnerID', '==', user.uid));

        const querySnapshot = await getDocs(q);
        this.wonAuctions = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            endtime: data['endtime']?.toDate(), // ✅ Convert Firestore Timestamp to JS Date
          };
        });
      }
    });
  }
}
