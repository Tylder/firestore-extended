import {Inject, Injectable, Optional} from '@angular/core';

import {EmulatorConfig, FIREBASE_FUNCTIONS_USE_EMULATOR, FirebaseConfig, FIRESTORE_USE_EMULATOR} from './config';
import {FirebaseApp, getApps, initializeApp} from 'firebase/app';
import {connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';
import {connectFunctionsEmulator, Functions, getFunctions} from 'firebase/functions';

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

  constructor(@Optional() config?: FirebaseConfig,
              @Optional() @Inject(FIRESTORE_USE_EMULATOR) public firestoreEmulatorConfig?: EmulatorConfig,
              @Optional() @Inject(FIREBASE_FUNCTIONS_USE_EMULATOR) public functionsEmulatorConfig?: EmulatorConfig) {

    if (!getApps().length) {
      if (config) {
        this.firebaseApp = initializeApp(config);
      } else {
        throw new Error('No previous Firebase App initialized so please provide a FirebaseConfig');
      }

    } else {
      this.firebaseApp = getApps()[0]; // if already initialized, use that one
    }

    if (firestoreEmulatorConfig) {
      connectFirestoreEmulator(getFirestore(this.firebaseApp), firestoreEmulatorConfig.host, firestoreEmulatorConfig.port); // v9
      // getFirestore(this.firebaseApp).useEmulator(emulatorConfig.host, emulatorConfig.port); // v8
    }
    if (functionsEmulatorConfig) {
      connectFunctionsEmulator(getFunctions(this.firebaseApp), functionsEmulatorConfig.host, functionsEmulatorConfig.port); // v9
    }

    // TODO add emulator support for remaining firebase functionality

  }

  get firestore(): Firestore {
    /** Convenience getter */
    return getFirestore(this.firebaseApp);
  }

  get functions(): Functions {
    /** Convenience getter */
    return getFunctions(this.firebaseApp);
  }
}
