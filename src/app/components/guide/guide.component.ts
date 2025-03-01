import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { InputSwitch } from 'primeng/inputswitch';
import { Button } from 'primeng/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide',
  imports: [FormsModule, NgIf, InputSwitch, Button, RouterLink],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.scss',
})
export class GuideComponent {
  isBuyerGuide: boolean = true;
}
