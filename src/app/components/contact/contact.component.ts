import { Component } from '@angular/core';
import { Card } from 'primeng/card';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { FormsModule, NgForm } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { Button } from 'primeng/button';
import { NgIf } from '@angular/common';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-contact',
  imports: [Card, PrimeTemplate, FormsModule, InputText, Toast, Button, NgIf],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  providers: [MessageService],
})
export class ContactComponent {
  contactData = { name: '', email: '', message: '' };

  constructor(
    private emailService: EmailService, // Inject the EmailService
    private messageService: MessageService,
  ) {}

  submitForm(contactForm: NgForm) {
    if (contactForm.invalid) {
      // Mark the form fields as touched to display validation errors
      this.markAllFieldsAsTouched(contactForm);
      return;
    }

    this.emailService.sendContactEmail(this.contactData).subscribe(
      (response) => {
        console.log('Message Sent:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Message Sent',
          detail:
            'Please keep an eye on your inbox as we will be in touch shortly',
        });
        this.contactData = { name: '', email: '', message: '' }; // Reset form data
        contactForm.resetForm(); // Reset form state
      },
      (error) => {
        console.error('Error sending message:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send message. Please try again.',
        });
      },
    );
  }

  // Helper function to mark all form fields as touched
  markAllFieldsAsTouched(form: NgForm) {
    for (const control in form.controls) {
      if (form.controls.hasOwnProperty(control)) {
        form.controls[control].markAsTouched();
      }
    }
  }
}
