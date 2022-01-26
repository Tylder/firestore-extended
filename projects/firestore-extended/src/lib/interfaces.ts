// A convience type for making a query.
// Example: const query = (ref) => ref.where('name', == 'david');
import {Observable} from 'rxjs';
import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreError,
  Query,
  QuerySnapshot,
  SetOptions,
  UpdateData
} from 'firebase/firestore';
import {FirebaseApp} from 'firebase/app';

// export type Query<T = DocumentData> = FirestoreQuery<T>;

// A convenience type for making a query.
// Example: const query = (ref) => ref.where('name', == 'david');
// export type QueryFn<T = DocumentData> = (ref: CollectionReference<T>) => Query<T>;

// export declare type FirestoreErrorCodeExt = 'sdsdsd' & FirestoreErrorCode;

export interface FirestoreErrorExt extends FirestoreError, DocumentData {
}

/** Used as a wrapper for adding a document, either doc or path must be specified, helps when adding multiple */
export interface AddDocumentWrapper<A> {
  /** The data to be added */
  data: A;

  /** Reference to the Document */
  ref?: DocumentReference;

  /** The path to the Document */
  path?: string;
}

export interface BaseFirestoreWrapper {
  firebaseApp: FirebaseApp;

  get firestore(): Firestore;

  /** get document and listen for real time updates */
  listenForDoc<T>(docRef: DocumentReference<T>): Observable<DocumentSnapshot<T>>;

  /** get document */
  getDoc<T>(docRef: DocumentReference<T>): Observable<DocumentSnapshot<T>>;

  set<T>(docRef: DocumentReference<T>, data: T, options?: SetOptions): Observable<void>;

  add<T>(collectionRef: CollectionReference<T>, data: T): Observable<DocumentReference<T>>;

  update<T>(docRef: DocumentReference<T>, data: UpdateData<Partial<T>>, options?: SetOptions): Observable<void>;

  delete<T>(docRef: DocumentReference<T>): Observable<void>;

  /** get collection and listen for real time updates */
  listenForCollection<T>(query: Query<T>): Observable<QuerySnapshot<T>>;

  /** get collection */
  getCollection<T>(query: Query<T>): Observable<QuerySnapshot<T>>;
}
