import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Button } from 'primeng/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-guide',
  imports: [FormsModule, NgIf, Button, RouterLink],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.scss',
})
export class GuideComponent {
  isBuyerGuide: boolean = true;

  toggleRole(isBuyerGuide: boolean) {
    this.isBuyerGuide = isBuyerGuide;
  }
}
