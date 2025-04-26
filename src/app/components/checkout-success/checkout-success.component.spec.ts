import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutSuccessComponent } from './checkout-success.component';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule
import { ActivatedRoute } from '@angular/router'; // Import ActivatedRoute

describe('CheckoutSuccessComponent', () => {
  let component: CheckoutSuccessComponent;
  let fixture: ComponentFixture<CheckoutSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CheckoutSuccessComponent,
        HttpClientModule, // Add HttpClientModule here
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'some-id' },
              queryParamMap: { get: () => 'some-query' }, // Mock queryParamMap
            },
          },
        }, // Mock ActivatedRoute
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
