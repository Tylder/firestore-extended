// import {InjectionToken} from '@angular/core';
// import {FirebaseApp} from 'firebase/app';

export class FirebaseConfig {
  [key: string]: any;
}

export interface EmulatorConfig {
  // useEmulator: boolean;
  host: string;
  port: number;
}

// export const FIREBASE_APP = new InjectionToken<FirebaseApp>('firebase_app.config');

export const FIRESTORE_USE_EMULATOR: EmulatorConfig = {
  // useEmulator: false,
  host: 'localhost',
  port: 8080,
};

export const FIREBASE_FUNCTIONS_USE_EMULATOR: EmulatorConfig = {
  // useEmulator: false,
  host: 'localhost',
  port: 5001,
};

// export type FirestoreEmulatorConfig  = {
//   useEmulator: boolean;
//   emulatorHost: string;
//   emulatorPort: 4200
// }
