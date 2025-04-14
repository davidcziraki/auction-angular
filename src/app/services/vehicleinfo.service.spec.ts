import { TestBed } from '@angular/core/testing';

import { VehicleInfoService } from './vehicleinfo.service';

describe('VehicleinfoService', () => {
  let service: VehicleInfoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
