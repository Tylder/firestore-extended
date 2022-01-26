// import {from, Observable} from 'rxjs';
// import {collection, doc} from 'rxfire/firestore';
// import {BaseFirestoreWrapper} from './interfaces';
// import {take} from 'rxjs/operators';
// import {FirebaseApp} from 'firebase/app';
// import {
//   addDoc,
//   CollectionReference,
//   deleteDoc,
//   DocumentData,
//   DocumentReference,
//   DocumentSnapshot,
//   Firestore,
//   getFirestore,
//   Query,
//   QueryDocumentSnapshot,
//   setDoc,
//   SetOptions,
//   UpdateData,
//   updateDoc
// } from 'firebase/firestore';
//
// export class RxFirestoreWrapper implements BaseFirestoreWrapper {
//
//   constructor(public firebaseApp: FirebaseApp) {
//   }
//
//   get firestore(): Firestore {
//     return getFirestore(this.firebaseApp);
//   }
//
//   // doc
//   public doc<T = DocumentData>(docRef: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
//     return doc(docRef) as Observable<DocumentSnapshot<T>>;
//   }
//
//   public set<A>(docRef: DocumentReference<A>, data: A, options?: SetOptions): Observable<void> {
//
//     if (options) {
//       return from(setDoc(docRef, data, options)).pipe(
//         take(1)
//       );
//     } else {
//       return from(setDoc(docRef, data)).pipe(
//         take(1)
//       );
//     }
//   }
//
//   delete<T>(docRef: DocumentReference<T>): Observable<void> {
//     return from(deleteDoc(docRef)).pipe(
//       take(1)
//     );
//   }
//
//   update<T>(docRef: DocumentReference<T>, data: UpdateData<Partial<T>>, options?: SetOptions): Observable<void> {
//     return from(updateDoc<Partial<T>>(docRef, data)).pipe(
//       take(1)
//     );
//   }
//
//   public collection<T>(collectionRef: Query<T>): Observable<QueryDocumentSnapshot<T>[]> {
//     return collection(collectionRef);
//   }
//
//   public add<T>(collectionRef: CollectionReference<T>, data: T): Observable<DocumentReference<T>> {
//     return from(addDoc(collectionRef, data)).pipe(
//       take(1)
//     );
//   }
//
//
// }
