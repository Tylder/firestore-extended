import {FirebaseApp} from 'firebase/app';
import {FirestoreWrapper} from './firestore-wrapper';
import {FirestoreExtended} from './firestore-extended';

/**
 * FirestoreExt Class that uses the FirestoreWrapper
 * Simply extend this class and give it an initialized FirebaseApp to use the FireStoreExtended methods.
 */
export class FirestoreExt extends FirestoreExtended {
  constructor(firebaseApp: FirebaseApp, defaultDocId: string = 'data') {
    super(new FirestoreWrapper(firebaseApp), defaultDocId);
  }
}
