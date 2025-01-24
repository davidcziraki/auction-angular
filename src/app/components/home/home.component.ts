import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputText } from 'primeng/inputtext';
import { InputIcon } from 'primeng/inputicon';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, IconField, InputText, InputIcon, Ripple],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
