import {Inject, Injectable, Optional} from '@angular/core';

import firebase from 'firebase/app';
import {FirebaseConfig, FIRESTORE_USE_EMULATOR, FirestoreEmulatorConfig} from './config';


@Injectable({
  providedIn: 'root'
})

export class NgxFirebaseService {
  /**
   * Service that holds the Firebase App
   * Inject this service into any other service that requires the Firebase App
   *
   * For example NgxFireStoreExtendedService injects this service
   */
  public app: firebase.app.App;

  constructor(@Optional() config?: FirebaseConfig,
              @Optional() @Inject(FIRESTORE_USE_EMULATOR) public emulatorConfig?: FirestoreEmulatorConfig) {

    if (!firebase.apps.length) {
      if (config) {
        this.app = firebase.initializeApp(config);
      } else {
        throw new Error('No previous Firebase App initialized so please provide a FirebaseConfig')
      }

    } else {
      this.app = firebase.app(); // if already initialized, use that one
    }

    if (emulatorConfig) {
      this.app.firestore().useEmulator(emulatorConfig.host, emulatorConfig.port);
    }
  }
}
