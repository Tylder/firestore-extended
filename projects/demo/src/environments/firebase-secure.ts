export const firebaseSecure = {
  apiKey: 'AIzaSyC-yb-1BbamtnSVYC7bSmPkcYkPp3g6owg',
  authDomain: 'angularfire-wrappers-demo.firebaseapp.com',
  projectId: 'angularfire-wrappers-demo',
  storageBucket: 'angularfire-wrappers-demo.appspot.com',
  messagingSenderId: '988359508518',
  appId: '1:988359508518:web:34128595c44f8132041ce7'
};

import firebaseConfig from '../../../../firebase.json';

export const firestoreEmulatorPort = firebaseConfig.emulators.firestore.port;
export const storageEmulatorPort = firebaseConfig.emulators.storage.port;
