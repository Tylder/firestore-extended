import { TestBed } from '@angular/core/testing';

import { NgxRestaurantFsService } from './ngx-restaurant-fs.service';

describe('NgxRestaurantFsService', () => {
  let service: NgxRestaurantFsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxRestaurantFsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
