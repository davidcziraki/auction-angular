import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-checkout-success',
  imports: [],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.scss',
})
export class CheckoutSuccessComponent implements OnInit {
  sessionId: string | null = null;
  paymentConfirmed = false;

  constructor(
    private route: ActivatedRoute,
    private paymentService: PaymentService,
  ) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (this.sessionId) {
      this.confirmPayment();
    }
  }

  confirmPayment() {
    this.paymentService.verifyPayment(this.sessionId!).subscribe({
      next: (response: any) => {
        console.log('Payment verified:', response);
        this.paymentConfirmed = true;
      },
      error: (error) => {
        console.error('Payment verification failed:', error);
      },
    });
  }
}
