import {Injectable} from '@angular/core';
import {RestaurantItem} from '../models/restaurant';
import {forkJoin, Observable} from 'rxjs';
import firebase from 'firebase/app';
import 'firebase/firestore';
import CollectionReference = firebase.firestore.CollectionReference;
import DocumentReference = firebase.firestore.DocumentReference;
import {environment} from '../../environments/environment';
import {DragAndDropItem} from '../models/groupItem';
import {mockDragAndDropItems} from '../mock/mockItems';
import {take, tap} from 'rxjs/operators';
import {SubCollectionQuery, SubCollectionWriter, RxFirestoreExtended, combineLatestToObject} from 'firestore-extended';
import {firestoreEmulatorPort} from '../../environments/firebase-secure';

const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  { name: 'address' },
  // { name: 'reviews' }, // make reviews a sub collection
  // {
  //   name: 'dishes',  // make dishes a sub collection
  //   subCollections: [ // sub collection inside a sub collection
  //     { name: 'images' } // make images a sub collection inside dishes
  //   ]
  // },
];

const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // add reviews sub Collection to restaurant object
  { name: 'address' },
  // {
  //   name: 'reviews',
  //   queryFn: ref => ref.orderBy('score', 'desc')
  //   // queryFn: ref => ref.where('score', '==', 123)
  // },
  // { // add dishes sub Collection to restaurant object
  //   name: 'dishes',
  //   subCollections: [
  //     { name: 'images' } // add images sub Collection to dish object
  //   ]
  // },
];


@Injectable({
  providedIn: 'root'
})
export class RestaurantFsService {
  app: firebase.app.App;
  rxFireExt: RxFirestoreExtended;  //  RxfirestoreExtended
  restaurantCollectionRef: CollectionReference<any>;

  constructor() {
    this.app = firebase.initializeApp(environment.firebase); // only call this once per application
    this.app.firestore().useEmulator('localhost', firestoreEmulatorPort);
    this.rxFireExt = new RxFirestoreExtended(this.app);  //  initialize RxFireStoreExtended with firestore
    this.restaurantCollectionRef = this.app.firestore().collection('test'); // AngularFirestoreCollectionRef to restaurants
  }

  /* LISTEN */
  listenForRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
    const docRef: DocumentReference<RestaurantItem> = this.restaurantCollectionRef.doc(restaurantId);
    return this.rxFireExt.listenForDoc$<RestaurantItem>(docRef, restaurantSubCollectionQueries);
    // return this.rxFireExt.listenForDoc$(docRef, DocNotExistAction.THROW_DOC_NOT_FOUND);
  }

  // doesn't get the reviews and dishes
  listenForRestaurants$(): Observable<RestaurantItem[]> {
    return this.rxFireExt.listenForCollection$<RestaurantItem>(this.restaurantCollectionRef, restaurantSubCollectionQueries);
  }

  listenForTest$(): Observable<any> {

    let collectionA = this.app.firestore().collection(this.restaurantCollectionRef.path)
    collectionA = collectionA
      .where('groupName', '==', 'A')
      .orderBy('index', 'asc') as CollectionReference

    let collectionB = this.app.firestore().collection(this.restaurantCollectionRef.path)
    collectionB = collectionB
      .where('groupName', '==', 'B')
      .orderBy('index', 'asc') as CollectionReference


    // return this.rxFireExt.listenForCollection$(collectionB).pipe(
    //   tap(d => {
    //     console.log(d)
    //   })
    // )

    return combineLatestToObject({
      // a: of(1, 2, 3, 4)
      a: this.rxFireExt.listenForCollection$(collectionA),
      b: this.rxFireExt.listenForCollection$(collectionB),
    }).pipe(
      // take(1),
      tap((d) => {
        console.log(d.a)
      })
    )
  }

  /* ADD */

  /**
   * Add the restaurant to the restaurantCollectionF.
   *
   * Since a docId is given as restaurant.name the document Id will not be random so that we cannot add 2 restaurants with the same name.
   */
  addRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
    return this.rxFireExt
      .add$<RestaurantItem>(restaurant, this.restaurantCollectionRef, restaurantSubCollectionWriters, true, restaurant.name);
  }

  // testAddRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
  //   return this.rxFireExt
  //     .add$<RestaurantItem>(restaurant, this.restaurantCollectionRef, restaurantSubCollectionWriters, true, restaurant.name);
  // }

  testAdd$(): Observable<DragAndDropItem[]> {

    const addObs$: Observable<any>[] = []

    mockDragAndDropItems.forEach(data => {
      const obs$ = this.rxFireExt.add$<DragAndDropItem>(data, this.restaurantCollectionRef)
      addObs$.push(obs$);
    })

    return forkJoin(addObs$).pipe(
      take(1)
    );
  }

  //
  // /* DELETE */
  //
  // /**
  //  * Deletes the restaurant document and all documents found in the sub collection specified in restaurantSubCollectionQueries
  //  * @param restaurantId - unique id
  //  */
  // deleteRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
  //   const docFs: AngularFirestoreDocument<RestaurantItem> = this.restaurantCollectionFs.doc(restaurantId);
  //   return this.ngFirestoreDeep.deleteDeep$(docFs, restaurantSubCollectionQueries);
  // }
  //
  // /**
  //  * Delete all restaurants and all documents in sub collections as described by the restaurantSubCollectionQueries.
  //  *
  //  * 1. Listens to all restaurants in collection.
  //  * 2. Since we only want to get the restaurants once and not continuously listen for updates we do a take(1)
  //  * 3. Map the list of restaurants to a list of AngularFirestoreDocuments.
  //  *    This is why we add this data to the FirestoreItem when we listen for a document.
  //  *    It makes any future operations on a document so much faster and cheaper since we already have its path and reference saved.
  //  * 4. switchMap to deleteMultipleDeep -> works the same as deleteMultipleDeep except we can give it a list of AngularFirestoreDocuments
  //  *    and it deletes them all asynchronously.
  //  */
  // deleteAllRestaurants$(): Observable<any> {
  //   return this.listenForRestaurants$().pipe(
  //     take(1),
  //     map((restaurants: RestaurantItem[]) => restaurants.map(rest => rest.docFs)),
  //     tap(val => console.log(val)),
  //     switchMap((docsFs: AngularFirestoreDocument[]) => this.ngFirestoreDeep.deleteMultipleDeep$(docsFs, restaurantSubCollectionQueries)),
  //   );
  // }

  deleteTestCollection$(): Observable<any> {
    return this.rxFireExt.deleteCollection$(this.restaurantCollectionRef, restaurantSubCollectionQueries);
  }
  //
  // /* EDIT/UPDATE */
  // editRestaurant$(restaurant: RestaurantItem, data: object): Observable<any> {
  //   return this.ngFirestoreDeep.updateDeep$(data, restaurant.docFs, restaurantSubCollectionWriters);
  // }
  //
  // changeIdOfRestaurant$(restaurant: RestaurantItem, newId: string): Observable<RestaurantItem> {
  //
  //   return this.ngFirestoreDeep.changeDocId$(restaurant.docFs,
  //                                            newId,
  //                                            restaurantSubCollectionQueries,
  //                                            restaurantSubCollectionWriters);
  // }
  //
  // /**
  //  * Adds review and updates the averageReviewScore on restaurant
  //  */
  // addReview$(restaurant: RestaurantItem, review: ReviewItem): Observable<ReviewItem> {
  //   const reviewCollectionFs: AngularFirestoreCollection<ReviewItem> =
  //     this.restaurantCollectionFs.doc(restaurant.id).collection('reviews');
  //
  //   return this.ngFirestoreDeep.addDeep$(review, reviewCollectionFs).pipe(
  //     switchMap(() => {
  //       // calculate new average score
  //       const scoreSum: number = restaurant.reviews
  //         .map(rev => rev.score)
  //         .reduce((sum, score) => sum += score) + review.score;
  //       let averageReviewScore: number = scoreSum / (restaurant.reviews.length + 1);
  //       averageReviewScore = parseFloat(averageReviewScore.toFixed(1)); // round to 1 decimal
  //
  //       return this.ngFirestoreDeep.updateDeep$({averageReviewScore}, restaurant.docFs); // update averageReviewScore
  //     })
  //   );
  // }

}
