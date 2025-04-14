import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { FirestoreService } from '../../services/firestore.service';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  // Mock Firestore service
  class MockFirestoreService {
    getCollection() {
      return of([]);
    }
  }

  // Mock Auth service
  class MockAuthService {
    // Mock authState$ observable to prevent the undefined error
    authState$ = of(null);

    // Mock currentUser to return a null user (or a real user if needed)
    currentUser() {
      return of(null);
    }
  }

  // Mock ActivatedRoute
  class MockActivatedRoute {
    snapshot = { params: {} };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: FirestoreService, useClass: MockFirestoreService },
        { provide: Auth, useValue: {} },
        { provide: AuthService, useClass: MockAuthService },
        { provide: ActivatedRoute, useClass: MockActivatedRoute }, // Mock ActivatedRoute
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
