import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuideComponent } from './guide.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('GuideComponent', () => {
  let component: GuideComponent;
  let fixture: ComponentFixture<GuideComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock any ActivatedRoute properties you use
            params: of({}), // If you use route params
            queryParams: of({}),
            snapshot: {
              data: {},
              paramMap: new Map(),
              queryParamMap: new Map(),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
