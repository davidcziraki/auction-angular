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

  createStripeAccount() {
    return this.http.post<{ account: string }>(
      `${this.apiBase}/api/account`,
      {},
    );
  }

  createAccountSession(accountId: string) {
    return this.http.post<{ client_secret: string }>(
      `${this.apiBase}/api/account_session`,
      {
        account: accountId,
      },
    );
  }

  // Function to fetch the client secret
  async fetchClientSecret(accountId: string): Promise<string> {
    try {
      const response = await this.http
        .post<{ client_secret: string }>(
          `${this.apiBase}/api/account_session`,
          { account: accountId }
        )
        .toPromise();

      if (!response || !response.client_secret) {
        throw new Error('Client secret not found');
      }

      return response.client_secret; // Return the client secret
    } catch (error) {
      console.error('Error fetching client secret:', error);
      throw new Error('Failed to fetch client secret'); // Throw error if the request fails
    }
  }



  createListingFee(docId: string) {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiBase}/createListingFee`,
      { docId }
    );
  }

}
