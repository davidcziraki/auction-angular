import { Component, HostListener } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, Ripple, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  isCtaVisible: boolean = false;
  searchInput: string = '';

  constructor(private router: Router) {}

  @HostListener('window:scroll', [])
  onScroll(): void {
    const ctaSection = document.querySelector('.cta-section') as HTMLElement;
    if (!ctaSection) return;

    const rect = ctaSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (rect.top < windowHeight * 0.95) {
      // 80% of the viewport
      this.isCtaVisible = true;
    }
  }

  submitSearch() {
    if (this.searchInput.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchInput.trim() },
      });
    }
  }
}
