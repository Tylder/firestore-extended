// import {InjectionToken} from '@angular/core';
// import {FirebaseApp} from 'firebase/app';

export class FirebaseConfig {
  [key: string]: any;
}

export interface FirestoreEmulatorConfig {
  // useEmulator: boolean;
  host: string;
  port: number;
}

// export const FIREBASE_APP = new InjectionToken<FirebaseApp>('firebase_app.config');

export const FIRESTORE_USE_EMULATOR: FirestoreEmulatorConfig = {
  // useEmulator: false,
  host: 'localhost',
  port: 8080,
};


// export type FirestoreEmulatorConfig  = {
//   useEmulator: boolean;
//   emulatorHost: string;
//   emulatorPort: 4200
// }
