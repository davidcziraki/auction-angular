import { Component } from '@angular/core';
import { Card } from 'primeng/card';
import { MessageService, PrimeTemplate } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { Button } from 'primeng/button';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-contact',
  imports: [Card, PrimeTemplate, FormsModule, InputText, Toast, Button, NgIf],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  providers: [MessageService],
})
export class ContactComponent {
  contactData = { name: '', email: '', message: '' };

  constructor(private messageService: MessageService) {}

  submitForm() {
    // Simulate sending message (Replace with actual API call)
    console.log('Message Sent:', this.contactData);

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Message Sent',
      detail: 'We will get back to you soon!',
    });

    // Reset form
    this.contactData = { name: '', email: '', message: '' };
  }
}
