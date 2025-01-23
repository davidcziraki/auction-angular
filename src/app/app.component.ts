import { Component, inject, OnInit } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { MegaMenuModule } from 'primeng/megamenu';
import { routes } from './app.routes';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MegaMenuModule, MenubarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'finalyear';
  routes = routes;
  menuItems: MenuItem[] | undefined;

  firestore: Firestore = inject(Firestore);
  items$: Observable<any[]>;

  constructor() {
    const aCollection = collection(this.firestore, 'items');
    this.items$ = collectionData(aCollection);
  }

  ngOnInit() {
    this.menuItems = [
      {
        label: 'Home',
        icon: 'pi pi-fw pi-home',
        routerLink: '/home',
      },
      {
        label: 'Search',
        icon: 'pi pi-fw pi-search',
        routerLink: '/search',
      },
      {
        label: 'Login',
        icon: 'pi pi-fw pi-user',
        routerLink: '/login',
      },
    ];
  }

  trackByName(index: number, item: any): number {
    return item.name; // Return the unique identifier
  }
}
