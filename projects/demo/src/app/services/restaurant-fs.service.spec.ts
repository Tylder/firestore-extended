import { TestBed } from '@angular/core/testing';

import { RestaurantFsService } from './restaurant-fs.service';

describe('RestaurantFsService', () => {
  let service: RestaurantFsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestaurantFsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
