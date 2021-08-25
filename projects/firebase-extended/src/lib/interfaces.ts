// A convience type for making a query.
// Example: const query = (ref) => ref.where('name', == 'david');
import firebase from 'firebase/app';
import 'firebase/firestore';
import DocumentData = firebase.firestore.DocumentData;
import CollectionReference = firebase.firestore.CollectionReference;
import {Observable} from 'rxjs';
import DocumentReference = firebase.firestore.DocumentReference;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import SetOptions = firebase.firestore.SetOptions;
import UpdateData = firebase.firestore.UpdateData;
import QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
import FirebaseError = firebase.FirebaseError;
export type Query<T = DocumentData> = firebase.firestore.Query<T>;

// A convenience type for making a query.
// Example: const query = (ref) => ref.where('name', == 'david');
export type QueryFn<T = DocumentData> = (ref: CollectionReference<T>) => Query<T>;

export interface FirebaseErrorExt extends FirebaseError, DocumentData {}

/** Used as a wrapper for adding a document, either doc or path must be specified, helps when adding multiple */
export interface AddDocumentWrapper<A> {
  /** The data to be added */
  data: A;

  /** Reference to the Document */
  ref?: DocumentReference;

  /** The path to the Document */
  path?: string;
}

export interface FirestoreWrapper {
  fbApp: firebase.app.App
  // doc
  doc(docRef: DocumentReference): Observable<DocumentSnapshot>
  set<A>(docRef: DocumentReference, data: A, options?: SetOptions): Observable<void>
  update(docRef: DocumentReference, data: UpdateData, options?: SetOptions): Observable<void>
  delete(docRef: DocumentReference): Observable<void>

  // collection
  collection(collectionRef: CollectionReference): Observable<QueryDocumentSnapshot[]>
  add<T>(collectionRef: CollectionReference<T>, data: T): Observable<DocumentReference<T>>
}
