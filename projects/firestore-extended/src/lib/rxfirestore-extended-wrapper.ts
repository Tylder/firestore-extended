import firebase from 'firebase';
import {from, Observable} from 'rxjs';
import {doc} from 'rxfire/firestore';
import CollectionReference = firebase.firestore.CollectionReference;
import DocumentReference = firebase.firestore.DocumentReference;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import {FirestoreWrapper} from './interfaces';
import SetOptions = firebase.firestore.SetOptions;
import {take} from 'rxjs/operators';
import {collection} from 'rxfire/firestore';
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

export class RxFirestoreWrapper implements FirestoreWrapper {

  constructor(public fbApp: firebase.app.App) {}

  // doc
  public doc(docRef: DocumentReference): Observable<DocumentSnapshot> {
    return doc(docRef);
  }

  // public set<A>(docRef: DocumentReference, data: Partial<A>, options?: SetOptions): Observable<DocumentReference<A>> {
  public set<A>(docRef: DocumentReference, data: A, options?: SetOptions): Observable<void> {

    if (options) {
      return from( docRef.set(data, options) ).pipe(
        take(1)
      );
    } else {
      return from( docRef.set(data) ).pipe(
        take(1)
      );
    }
  }

  delete<A>(docRef: firebase.firestore.DocumentReference): Observable<void> {
    return from ( docRef.delete() ).pipe(
      take(1)
    );
  }

  update<A>(docRef: firebase.firestore.DocumentReference, data: firebase.firestore.UpdateData, options?: firebase.firestore.SetOptions): Observable<void> {
    return from ( docRef.update(data) ).pipe(
      take(1)
    );
  }

  public collection(collectionRef: CollectionReference): Observable<QueryDocumentSnapshot[]> {
    return collection(collectionRef);
  }

  public add<T>(collectionRef: CollectionReference<T>, data: T): Observable<DocumentReference<T>> {
    return from( collectionRef.add(data) ).pipe(
      take(1)
    );
  }


}
