import {Injectable} from '@angular/core';

import {RxFirestoreExtended} from '../rxfirestore-extended';
import {NgxFirebaseService} from './ngx-firebase.service';
import firebase from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class NgxFirestoreExtendedService {

  public fireExt: RxFirestoreExtended;

  constructor(private ngxFirebaseService: NgxFirebaseService) {
    this.fireExt = new RxFirestoreExtended(ngxFirebaseService.app);  /* inject Firebase App from NgxFirebaseService */
  }

  get app(): firebase.app.App {
    /** Convenience getter */
    return this.ngxFirebaseService.app;
  }
}
