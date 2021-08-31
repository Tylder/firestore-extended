import {FirestoreExtended} from './firestore-extended';
import firebase from 'firebase/app';
import {RxFirestoreWrapper} from './rxfirestore-extended-wrapper';

export class RxFirestoreExtended extends FirestoreExtended {

  constructor(fbApp: firebase.app.App, defaultDocId: string = 'data') {
    super(new RxFirestoreWrapper(fbApp), defaultDocId);
  }
}
