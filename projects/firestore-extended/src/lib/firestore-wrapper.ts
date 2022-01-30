import {from, Observable} from 'rxjs';
import {BaseFirestoreWrapper} from './interfaces';
import {take} from 'rxjs/operators';
import {FirebaseApp} from 'firebase/app';
import {
  addDoc,
  CollectionReference,
  deleteDoc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreError,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  Query,
  QuerySnapshot,
  setDoc,
  SetOptions,
  UpdateData,
  updateDoc,
} from 'firebase/firestore';


export class FirestoreWrapper implements BaseFirestoreWrapper {
  /**
   * Uses firebase/firestore directly
   * Simply makes the returned Promises into Observables
   */

  constructor(public firebaseApp: FirebaseApp) {
  }

  get firestore(): Firestore {
    return getFirestore(this.firebaseApp);
  }

  public getDoc<T = DocumentData>(docRef: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
    return from(getDoc(docRef));
  }

  public listenForDoc<T = DocumentData>(docRef: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
    return new Observable<DocumentSnapshot<T>>(observer => {
      return onSnapshot(
        docRef,
        (snapshot: DocumentSnapshot<T>) => observer.next(snapshot),
        (error: FirestoreError) => {
          observer.unsubscribe();
          console.log('unsub doc');
          return error;
        },
        () => {
          observer.unsubscribe();
          console.log('complete doc');
        });
    });
  }

  public add<T>(collectionRef: CollectionReference<T>, data: T): Observable<DocumentReference<T>> {
    return from(addDoc(collectionRef, data)).pipe(
      take(1)
    );
  }

  public set<A>(docRef: DocumentReference<A>, data: A, options?: SetOptions): Observable<void> {

    if (options) {
      return from(setDoc(docRef, data, options)).pipe(
        take(1)
      );
    } else {
      return from(setDoc(docRef, data)).pipe(
        take(1)
      );
    }
  }

  delete<T>(docRef: DocumentReference<T>): Observable<void> {
    return from(deleteDoc(docRef)).pipe(
      take(1)
    );
  }

  update<T>(docRef: DocumentReference<T>, data: UpdateData<Partial<T>>, options?: SetOptions): Observable<void> {
    return from(updateDoc<Partial<T>>(docRef, data)).pipe(
      take(1)
    );
  }

  public getCollection<T>(q: Query<T>): Observable<QuerySnapshot<T>> {
    return from(getDocs(q));
  }

  public listenForCollection<T>(q: Query<T>): Observable<QuerySnapshot<T>> {

    return new Observable<QuerySnapshot<T>>(observer => {
      return onSnapshot(
        q,
        (snapshot: QuerySnapshot<T>) => observer.next(snapshot),
        (error: FirestoreError) => {
          observer.unsubscribe();
          return error;
        },
        () => observer.unsubscribe());
    });
  }

}



