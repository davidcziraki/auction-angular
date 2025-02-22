import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputText } from 'primeng/inputtext';
import { InputIcon } from 'primeng/inputicon';
import { Ripple } from 'primeng/ripple';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-home',
  imports: [
    ButtonModule,
    IconField,
    InputText,
    InputIcon,
    Ripple,
    RouterLink,
    Card,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
