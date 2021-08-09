import {FirestoreExtended} from './firestore-extended';
import {RxFireWrapper} from './rxfire-extended-wrapper';
import firebase from 'firebase';

export class RxFirestoreExtended extends FirestoreExtended {

  constructor(fbApp: firebase.app.App, defaultDocId: string = 'data') {
    super(new RxFireWrapper(fbApp), defaultDocId);
  }
}
