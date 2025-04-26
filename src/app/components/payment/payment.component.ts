import { Component, OnInit } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-payment',
  imports: [],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss',
})
export class PaymentComponent implements OnInit {
  stripe: Stripe | null = null;
  elements: any;
  clientSecret: string = '';

  async ngOnInit() {
    this.stripe = await loadStripe(
      'pk_test_51Qz6yCKigABo6LYNncGHQE1npiAbeZXiVNm3WwYPVTI4A67o9rIgtalMkCLhgK0NLoniDRJHfjxNOgsDXMAo0wBr00asmo1tbC',
    );
    this.createCheckoutSession();
  }

  async createCheckoutSession() {
    const response = await fetch(
      'your_firebase_function_url/create-checkout-session',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = await response.json();
    this.clientSecret = data.clientSecret;

    if (this.stripe) {
      this.elements = this.stripe.elements();
      const checkoutElement = this.elements.create('payment', {
        clientSecret: this.clientSecret,
      });
      checkoutElement.mount('#checkout-element');
    }
  }
}
