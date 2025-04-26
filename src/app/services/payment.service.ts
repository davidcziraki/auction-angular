import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiBase = 'https://us-central1-final-year-bc4ca.cloudfunctions.net';

  constructor(private http: HttpClient) {}

  createCheckoutSession(auctionData: any) {
    return this.http.post(
      `${this.apiBase}/api/create-checkout-session`,
      auctionData,
    );
  }

  verifyPayment(sessionId: string) {
    console.log('Verifying payment for session ID:', sessionId);
    return this.http.get(
      `${this.apiBase}/verifyPayment?session_id=${sessionId}`,
    );
  }
}
