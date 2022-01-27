export const firebaseSecure = {
  apiKey: 'AIzaSyAVGRLOkrlRPrZwCxDvxAo4yPAnnQuXnAo',
  authDomain: 'fir-extended-demo.firebaseapp.com',
  projectId: 'fir-extended-demo',
  storageBucket: 'fir-extended-demo.appspot.com',
  messagingSenderId: '519662156647',
  appId: '1:519662156647:web:bff1a917bd07a9d9eacdc2'
};

import firebaseConfig from '../../../../firebase.json';

export const firestoreEmulatorPort = firebaseConfig.emulators.firestore.port;
export const storageEmulatorPort = firebaseConfig.emulators.storage.port;
