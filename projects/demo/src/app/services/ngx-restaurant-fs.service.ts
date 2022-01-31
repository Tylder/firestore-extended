import {Injectable} from '@angular/core';
import {
  getDocRefWithId,
  getSubCollection,
  NgxFirebaseService,
  NgxFirestoreExtService,
  SubCollectionQuery,
  SubCollectionWriter
} from 'firestore-extended';
import {collection, CollectionReference, DocumentReference, orderBy} from 'firebase/firestore';
import {Observable} from 'rxjs';
import {RestaurantItem, ReviewItem} from '../models/restaurant';
import {switchMap} from 'rxjs/operators';
import {FireItem} from '../../../../firestore-extended/src/lib/models/fireItem';

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
/**
 * Firestore Restaurant service for Angular.
 * Same as RestaurantFsService except that it uses the specific Angular module that initializes firebaseApp.
 */
export class NgxRestaurantFsService extends NgxFirestoreExtService {

  public restaurantCollectionRef: CollectionReference<any>;

  constructor(ngxFirebaseService: NgxFirebaseService) {
    super(ngxFirebaseService);

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

  /* ADD */

  /**
   * Add the restaurant to the restaurantCollectionF.
   *
   * Since a docId is given as restaurant.name the document Id will not be random so that we cannot add 2 restaurants with the same name.
   */
  addRestaurant$(restaurant: RestaurantItem): Observable<FireItem<RestaurantItem>> {
    return this.firestoreExt
      .add$<RestaurantItem>(restaurant, this.restaurantCollectionRef, restaurantSubCollectionWriters, true, restaurant.name);
  }

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

  changeIdOfRestaurant$(restaurant: FireItem<RestaurantItem>, newId: string): Observable<FireItem<RestaurantItem>> {

    const ref = restaurant.firestoreMetadata.ref;

    return this.firestoreExt.changeDocId$<RestaurantItem>(restaurant.firestoreMetadata.ref,
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
