import {Inject, Injectable, Optional} from '@angular/core';

import {FirebaseConfig, FIRESTORE_USE_EMULATOR, FirestoreEmulatorConfig} from './config';
import firebase, {FirebaseApp, initializeApp} from 'firebase/app';
import {connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';
import {FirestoreExt} from '../firestore-extended.class';


@Injectable({
  providedIn: 'root'
})

/**
 * Service that holds the Firebase App
 * Inject this service into any other service that requires the Firebase App and FirestoreExt
 *
 * ex.
 * export class SomeService() {
 *   construct(ngxFireStoreExtendedService: NgxFireStoreExtendedService) {
 *     fireExt = ngxFireStoreExtendedService.fireExt
 *   }
 * }
 *
 */
export class NgxFirebaseService {

  public firebaseApp: FirebaseApp;
  public firestoreExt: FirestoreExt;

  constructor(@Optional() config?: FirebaseConfig,
              @Optional() @Inject(FIRESTORE_USE_EMULATOR) public emulatorConfig?: FirestoreEmulatorConfig) {

    if (!firebase.getApps().length) {
      if (config) {
        this.firebaseApp = initializeApp(config);
      } else {
        throw new Error('No previous Firebase App initialized so please provide a FirebaseConfig');
      }

    } else {
      this.firebaseApp = firebase.getApps()[0]; // if already initialized, use that one
    }

    if (emulatorConfig) {
      connectFirestoreEmulator(getFirestore(this.firebaseApp), emulatorConfig.host, emulatorConfig.port); // v9
      // getFirestore(this.firebaseApp).useEmulator(emulatorConfig.host, emulatorConfig.port); // v8
    }

    this.firestoreExt = new FirestoreExt(this.firebaseApp);
  }

  get firestore(): Firestore {
    /** Convenience getter */
    return getFirestore(this.firebaseApp);
  }
}
