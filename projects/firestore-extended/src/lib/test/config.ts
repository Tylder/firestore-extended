import firebaseConfig from '../../../../../firebase.json';

export default {
  apiKey: 'AIzaSyC-yb-1BbamtnSVYC7bSmPkcYkPp3g6owg',
  authDomain: 'angularfire-wrappers-demo.firebaseapp.com',
  projectId: 'angularfire-wrappers-demo',
  storageBucket: 'angularfire-wrappers-demo.appspot.com',
  messagingSenderId: '988359508518',
  appId: '1:988359508518:web:08b23bdf2235ed6c041ce7'
};

// export const authEmulatorPort = firebaseConfig.emulators.auth.port;
// export const databaseEmulatorPort = firebaseConfig.emulators.database.port;
export const firestoreEmulatorPort = firebaseConfig.emulators.firestore.port;
export const storageEmulatorPort = firebaseConfig.emulators.storage.port;
// export const functionsEmulatorPort = firebaseConfig.emulators.functions.port;

