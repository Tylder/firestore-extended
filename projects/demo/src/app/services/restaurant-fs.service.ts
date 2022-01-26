import {Injectable} from '@angular/core';
import {RestaurantItem, ReviewItem} from '../models/restaurant';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {switchMap} from 'rxjs/operators';
import {firestoreEmulatorPort} from '../../environments/firebase-secure';
import {FirebaseApp, initializeApp} from 'firebase/app';
import {
  collection,
  CollectionReference,
  connectFirestoreEmulator,
  DocumentReference,
  Firestore,
  getFirestore,
  orderBy
} from 'firebase/firestore';
import {FireItem, FirestoreExt, getDocRefWithId, getSubCollection, SubCollectionQuery, SubCollectionWriter} from 'firestore-extended';

const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  {name: 'address'},
  {name: 'reviews'}, // make reviews a sub collection
  {
    name: 'dishes',  // make dishes a sub collection
    subCollections: [ // sub collection inside a sub collection
      {name: 'images'} // make images a sub collection inside dishes
    ]
  },
];

const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // add reviews sub Collection to restaurant object
  {name: 'address'},
  {
    name: 'reviews',
    queryConstraints: [orderBy('score', 'desc')],
  },
  { // add dishes sub Collection to restaurant object
    name: 'dishes',
    subCollections: [
      {name: 'images'} // add images sub Collection to dish object
    ]
  },
];


@Injectable({
  providedIn: 'root'
})
export class RestaurantFsService {
  app: FirebaseApp;
  firestoreExt: FirestoreExt;  //  FirestoreExt
  restaurantCollectionRef: CollectionReference<any>;
  firestore: Firestore;

  constructor() {
    this.app = initializeApp(environment.firebase); // only call this once per application
    this.firestore = getFirestore(this.app);
    connectFirestoreEmulator(this.firestore, 'localhost', firestoreEmulatorPort);

    this.firestoreExt = new FirestoreExt(this.app);  //  initialize RxFireStoreExtended with firestore

    this.restaurantCollectionRef = collection(this.firestore, 'demo_restaurants'); // AngularFirestoreCollectionRef to restaurants
  }

  /* LISTEN */
  listenForRestaurantById$(restaurantId: string): Observable<FireItem<RestaurantItem>> {
    const docRef: DocumentReference<RestaurantItem> = getDocRefWithId(this.restaurantCollectionRef, restaurantId);
    return this.firestoreExt.listenForDoc$<RestaurantItem>(docRef, restaurantSubCollectionQueries);
  }

  // doesn't get the reviews and dishes
  listenForRestaurants$(): Observable<FireItem<RestaurantItem>[]> {
    // return this.firestoreExt.listenForCollection$<RestaurantItem>(this.restaurantCollectionRef, restaurantSubCollectionQueries);
    return this.firestoreExt.listenForCollection$<RestaurantItem>(this.restaurantCollectionRef);
  }

  //
  // listenForTest$(): Observable<any> {
  //
  //   const queryContainerA = QueryContainer.fromPath(this.firestore, this.restaurantCollectionRef.path);
  //
  //   queryContainerA
  //     .where('groupName', '==', 'A')
  //     .orderBy('index', 'asc');
  //
  //   const queryContainerB = QueryContainer.fromPath(this.firestore, this.restaurantCollectionRef.path);
  //
  //   queryContainerA
  //     .where('groupName', '==', 'B')
  //     .orderBy('index', 'asc');
  //
  //   return combineLatestToObject({
  //     // a: of(1, 2, 3, 4)
  //     a: this.firestoreExt.listenForCollection$(queryContainerA.query),
  //     b: this.firestoreExt.listenForCollection$(queryContainerB.query),
  //   }).pipe(
  //     // take(1),
  //     tap((d) => {
  //       console.log(d.a);
  //     })
  //   );
  // }

  /* ADD */

  /**
   * Add the restaurant to the restaurantCollectionF.
   *
   * Since a docId is given as restaurant.name the document Id will not be random so that we cannot add 2 restaurants with the same name.
   */
  addRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
    return this.firestoreExt
      .add$<RestaurantItem>(restaurant, this.restaurantCollectionRef, restaurantSubCollectionWriters, true, restaurant.name);
  }

  //
  // testAdd$(): Observable<DragAndDropItem[]> {
  //
  //   const addObs$: Observable<any>[] = [];
  //
  //   mockDragAndDropItems.forEach(data => {
  //     const obs$ = this.firestoreExt.add$<DragAndDropItem>(data, this.restaurantCollectionRef);
  //     addObs$.push(obs$);
  //   });
  //
  //   return forkJoin(addObs$).pipe(
  //     take(1)
  //   );
  // }


  /* DELETE */

  /**
   * Deletes the restaurant document and all documents found in the sub collection specified in restaurantSubCollectionQueries
   * @param restaurantId - unique id
   */
  deleteRestaurantById$(restaurantId: string): Observable<void> {
    const docRef: DocumentReference<RestaurantItem> = getDocRefWithId(this.restaurantCollectionRef, restaurantId);
    return this.firestoreExt.delete$(docRef, restaurantSubCollectionQueries);
  }

  /**  Delete all restaurants and all documents in sub collections as described by the restaurantSubCollectionQueries. */
  deleteAllRestaurants$(): Observable<any> {
    return this.firestoreExt.deleteCollection$(this.restaurantCollectionRef, restaurantSubCollectionQueries);
  }

  /* EDIT/UPDATE */
  editRestaurant$(restaurant: FireItem<RestaurantItem>, data: object): Observable<any> {
    return this.firestoreExt.update$(data, restaurant.firestoreMetadata.ref, restaurantSubCollectionWriters);
  }

  changeIdOfRestaurant$(restaurant: FireItem<RestaurantItem>, newId: string): Observable<RestaurantItem> {
    return this.firestoreExt.changeDocId$(restaurant.firestoreMetadata.ref,
      newId,
      restaurantSubCollectionQueries,
      restaurantSubCollectionWriters);
  }

  /**
   * Adds review and updates the averageReviewScore on restaurant
   */
  addReview$(restaurant: FireItem<RestaurantItem>, review: ReviewItem): Observable<void> {
    const reviewCollection = getSubCollection<RestaurantItem, ReviewItem>(restaurant.firestoreMetadata.ref, 'reviews');

    return this.firestoreExt.add$(review, reviewCollection).pipe(
      switchMap(() => {
        // calculate new average score
        const scoreSum: number = restaurant.reviews
          .map((rev: ReviewItem) => review.score)
          .reduce((sum: number, score: number) => sum += score) + review.score;
        let averageReviewScore: number = scoreSum / (restaurant.reviews.length + 1);
        averageReviewScore = parseFloat(averageReviewScore.toFixed(1)); // round to 1 decimal

        return this.firestoreExt.update$({averageReviewScore}, restaurant.firestoreMetadata.ref); // update averageReviewScore
      })
    );
  }

}
