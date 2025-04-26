import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-checkout-success',
  imports: [NgIf],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.scss',
})
export class CheckoutSuccessComponent implements OnInit {
  sessionId: string | null = null;
  paymentConfirmed = false;

  constructor(
    private route: ActivatedRoute,
    private paymentService: PaymentService,
    private router: Router,
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

        setTimeout(() => {
          this.router.navigate(['/account'], { queryParams: { tabValue: 1 } });
        }, 5000); // 2 second delay for UX
      },
      error: (error) => {
        console.error('Payment verification failed:', error);
      },
    });
  }
}
