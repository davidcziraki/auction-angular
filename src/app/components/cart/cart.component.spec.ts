// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { CartComponent } from './cart.component';
// import { ActivatedRoute } from '@angular/router';
// import { of } from 'rxjs';
//
// // Mock ActivatedRoute
// class ActivatedRouteStub {
//   snapshot = { paramMap: { get: () => 'mockId' } };
//   params = of({}); // Return an observable for route params if needed
// }
//
// describe('CartComponent', () => {
//   let component: CartComponent;
//   let fixture: ComponentFixture<CartComponent>;
//
//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [CartComponent],
//       providers: [
//         { provide: ActivatedRoute, useClass: ActivatedRouteStub }, // Provide the mock ActivatedRoute
//       ],
//     }).compileComponents();
//
//     fixture = TestBed.createComponent(CartComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
