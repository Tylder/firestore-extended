import {Injectable} from '@angular/core';
import {FirebaseApp} from 'firebase/app';
import {FirestoreExt} from '../firestore-extended.class';
import {NgxFirebaseService} from './ngx-firebase.service';
import {Firestore} from 'firebase/firestore';


@Injectable({
  providedIn: 'root'
})

/**
 * Convenience Service meant to be injected
 * Inject this service into any other service that requires the Firebase App and FirestoreExt
 *
 */
export class NgxFirestoreExtService {

  public firestoreExt: FirestoreExt;
  public firestore: Firestore;
  public firebaseApp: FirebaseApp;

  constructor(ngxFirebaseService: NgxFirebaseService) {
    this.firestoreExt = ngxFirebaseService.firestoreExt;
    this.firebaseApp = ngxFirebaseService.firebaseApp;
    this.firestore = ngxFirebaseService.firestore;
  }
}
