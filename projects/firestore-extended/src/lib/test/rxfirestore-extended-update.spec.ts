import {
  default as TEST_PROJECT,
  firestoreEmulatorPort,
} from './config';
import {RxFirestoreExtended} from '../rxfirestore-extended';
import {mockDeepItems} from './mock/mockItems';
import firebase from 'firebase/app';
import 'firebase/firestore';

import {SubCollectionWriter} from '../sub-collection-writer';
import {AddressItem, DishItem, RestaurantItem} from './models/restaurant';
import {catchError, switchMap, take, tap} from 'rxjs/operators';
import {forkJoin, Observable, of, Subscription} from 'rxjs';
import {SubCollectionQuery} from '../sub-collection-query';
import {DocNotExistAction} from '../firestore-extended';
import CollectionReference = firebase.firestore.CollectionReference;
import DocumentReference = firebase.firestore.DocumentReference;
import {createId, isCompleteFirestoreMetadata, isDatesExists} from './utils';
import {FireItem, FirestoreItem} from '../models/firestoreItem';
import DocumentData = firebase.firestore.DocumentData;
import FirebaseError = firebase.FirebaseError;

describe('RxFire Firestore Extended Update', () => {
  let app: firebase.app.App;
  let firestore: firebase.firestore.Firestore;
  let rxFireExt: RxFirestoreExtended;
  let subscription: Subscription;
  let collectionName: string = 'update'

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the test are run
   * against the emulator
   */
  beforeEach(() => {
    console.log('beforeEach outer');
    app = firebase.initializeApp(TEST_PROJECT, createId());
    firestore = app.firestore();
    firestore.useEmulator('localhost', firestoreEmulatorPort);
    rxFireExt = new RxFirestoreExtended(app);  //  initialize RxFireStoreExtended with firestore

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000;
  });

  afterEach(() => {
    console.log('afterEach outer');
    subscription.unsubscribe();
    app.delete().catch();
  });

  afterAll(() => {
    console.log('afterAll outer');
  });

  describe('update$ shallow', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference;
    let origData: Readonly<RestaurantItem>;

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = []
      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, ).pipe(
        tap((item) => testDocRef = item.firestoreMetadata.ref),
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionWriters: SubCollectionWriter[] = []
      const subCollectionQueries: SubCollectionQuery[] = []

      const newAddress: AddressItem = {
        zipCode: '55555',
        city: 'updated city',
        line1: '99 example street'
      }

      subscription = rxFireExt.update$<RestaurantItem>({address: newAddress}, testDocRef, subCollectionWriters).pipe(
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        tap(d => {

          expect(d).toBeTruthy();
          expect(d.address).toEqual(newAddress)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('change doc id', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = []
      let newDocRef: DocumentReference;

      subscription = rxFireExt.changeDocId$<RestaurantItem>(testDocRef, 'newId', subCollectionQueries).pipe(
        // changeDocId
        tap(d => {
          newDocRef = d.firestoreMetadata.ref;
        }),
        // Listen for doc at newDocRef
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(newDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        tap(d => {

          expect(d).toBeTruthy();

          expect(d.firestoreMetadata.id).toEqual("newId")

          const cleanData = rxFireExt.cleanExtrasFromData<Partial<RestaurantItem>>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          expect(cleanData).toEqual(d)
        }),
        take(1),
        // listen for doc at old docRef..should not exist
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeFalsy();
        }),
      ).subscribe(() => done());
    });

    it('moveItemInArray$ on non doc throw error', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = []

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        switchMap(d => {
          return rxFireExt.moveItemInArray$<DishItem>(d.dishes as FireItem<DishItem>[], 0, 1)
        }),
        catchError((err: FirebaseError) => {
          expect(err.code).toEqual('firestoreExt/unable-to-change-index-of-non-document');
          return of(err);
        }),
        take(1)
      ).subscribe(() => done());

    });
  });

  describe('update$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference;
    let origData: Readonly<RestaurantItem>;
    let subCollectionWriters: SubCollectionWriter[];

    beforeEach((done: DoneFn) => {
      subCollectionWriters = [
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];
      origData = Object.assign({},mockDeepItems[0]);
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, ).pipe(
        tap((item) => testDocRef = item.firestoreMetadata.ref),
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ]

      const newAddress: AddressItem = {
        zipCode: '55555',
        city: 'updated city',
        line1: '99 example street'
      }

      subscription = rxFireExt.update$<RestaurantItem>({address: newAddress, }, testDocRef, subCollectionWriters).pipe(
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        tap(d => {

          expect(d).toBeTruthy();
          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate']);
          expect(cleanData.address).toEqual(newAddress)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('change doc id', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ]

      let newDocRef: DocumentReference;

      subscription = rxFireExt.changeDocId$<RestaurantItem>(testDocRef, 'newId', subCollectionQueries).pipe(
        // changeDocId
        tap(d => {
          newDocRef = d.firestoreMetadata.ref;
        }),
        // Listen for doc at newDocRef
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(newDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        tap(d => {

          expect(d).toBeTruthy();

          expect(d.firestoreMetadata.id).toEqual("newId")

          const cleanData = rxFireExt.cleanExtrasFromData<Partial<RestaurantItem>>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          expect(cleanData).toEqual(d)
        }),
        take(1),
        // listen for doc at old docRef..should not exist
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeFalsy();
        }),
      ).subscribe(() => done());
    });

    it('moveItemInArray$ useCopy false', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.moveItemInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], 0, 2, false)
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes)) // since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 1)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string)
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[3].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('moveItemInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.moveItemInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], 0, 2, true)
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          // since we used useCopy = true, the given array (originalSavedData.dishes) should not have been changed and will therefore not be equal
          // the originalSavedData.dishes should instead match the original dishes
          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes))

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 1)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string)
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[3].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemInArray$ useCopy false', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        { name: 'images' }
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.deleteIndexedItemInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], 1, dishSubCollectionQueries, false);
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes)) // since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string)
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        { name: 'images' }
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.deleteIndexedItemInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], 1, dishSubCollectionQueries, true);
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          // since we used useCopy = true, the given array (originalSavedData.dishes) should not have been changed and will therefore not be equal
          // the originalSavedData.dishes should instead match the original dishes
          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes))

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string)
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemsInArray$ useCopy false', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        { name: 'images' }
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.deleteIndexedItemsInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], [1, 2], dishSubCollectionQueries, false);
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes)) // since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemsInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        { name: 'images' }
      ]

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(d => {
          return rxFireExt.deleteIndexedItemsInArray$<DishItem>(originalSavedData.dishes as FireItem<DishItem>[], [1, 2], dishSubCollectionQueries, true);
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionQueries, ['modifiedDate', 'createdDate'])
          const cleanOriginalSavedData = rxFireExt.cleanExtrasFromData<RestaurantItem>(originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate'])

          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes)) // since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string)
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string)
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('updateMultiple$', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryFn: ref => ref.orderBy('index'),
        },
      ]

      const dataToAddToEach = {
        foo: "bar"
      }

      subscription = rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),

        switchMap(d => {
          const docRefs = d.dishes.map((dish: DishItem) => (dish as FireItem<DishItem>).firestoreMetadata.ref);
          return rxFireExt.updateMultiple$(docRefs, dataToAddToEach, );
        }),
        switchMap(d => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL)
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          d.dishes.forEach((dish: { [field: string]: any }) => {
            expect(dish?.foo).toBeTruthy()
          })

        }),
        take(1)
      ).subscribe(() => done());

    });

  });

});
