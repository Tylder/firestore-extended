import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {mockDeepItems} from './mock/mockItems';

import {SubCollectionWriter} from '../sub-collection-writer';
import {AddressItem, DishItem, RestaurantItem} from './models/restaurant';
import {catchError, map, switchMap, take, tap} from 'rxjs/operators';
import {of, Subscription} from 'rxjs';
import {SubCollectionQuery} from '../sub-collection-query';
import {DocNotExistAction} from '../firestore-extended';
import {createId} from './utils';
import {FireItem} from '../models/fireItem';
import {deleteApp, FirebaseApp, initializeApp} from 'firebase/app';
import {
  collection,
  CollectionReference,
  connectFirestoreEmulator,
  DocumentReference,
  Firestore,
  getFirestore,
  orderBy
} from 'firebase/firestore';
import {FirestoreExt} from '../firestore-extended.class';
import {FirestoreErrorExt} from '../interfaces';

describe('Firestore Extended Update', () => {
  let app: FirebaseApp;
  let firestore: Firestore;
  let fireExt: FirestoreExt;
  let subscription: Subscription;
  const collectionName: string = 'update';

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
    app = initializeApp(TEST_PROJECT, createId());
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, 'localhost', firestoreEmulatorPort);
    fireExt = new FirestoreExt(app);  //  initialize FirestoreExtClass with firestore

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000;
  });

  afterEach(() => {
    console.log('afterEach outer');
    subscription.unsubscribe();
    deleteApp(app).catch();
  });

  afterAll(() => {
    console.log('afterAll outer');
  });

  describe('update$ shallow', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference<RestaurantItem>; // ref to created doc
    let origData: Readonly<RestaurantItem>;

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [];
      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters).pipe(
        tap((item) => testDocRef = item.firestoreMetadata.ref),
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionWriters: SubCollectionWriter[] = [];
      const subCollectionQueries: SubCollectionQuery[] = [];

      const newAddress: AddressItem = {
        zipCode: '55555',
        city: 'updated city',
        line1: '99 example street'
      };

      subscription = fireExt.update$<RestaurantItem>({address: newAddress}, testDocRef, subCollectionWriters).pipe(
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        tap((d: FireItem<RestaurantItem>) => {
          expect(d).toBeTruthy();
        }),
        map((d) => fireExt.cleanExtrasFromData(d)),
        tap((d: RestaurantItem) => {
          expect(d.address).toEqual(newAddress);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('change doc id', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [];
      let newDocRef: DocumentReference<RestaurantItem>;

      subscription = fireExt.changeDocId$<RestaurantItem>(testDocRef, 'newId', subCollectionQueries).pipe(
        // changeDocId
        tap(d => {
          newDocRef = d.firestoreMetadata.ref;
        }),
        // Listen for doc at newDocRef
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(newDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        tap(d => {

          expect(d).toBeTruthy();

          expect(d.firestoreMetadata.id).toEqual('newId');

          const cleanData = fireExt.cleanExtrasFromData<Partial<RestaurantItem>>(d, subCollectionQueries, ['modifiedDate', 'createdDate']);
          expect(cleanData).toEqual(d);
        }),
        take(1),
        // listen for doc at old docRef..should not exist
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeFalsy();
        }),
      ).subscribe(() => done());
    });

    it('moveItemInArray$ on non doc throw error', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [];

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        switchMap((d: FireItem<RestaurantItem>) => {
          return fireExt.moveItemInArray$<DishItem>(d.dishes, 0, 1);
        }),
        catchError((err: FirestoreErrorExt) => {
          expect(err.name).toEqual('firestoreExt/unable-to-change-index-of-non-document');
          return of(err);
        }),
        take(1)
      ).subscribe(() => done());

    });
  });

  describe('update$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>;
    let subCollectionWriters: SubCollectionWriter[];

    beforeEach((done: DoneFn) => {
      subCollectionWriters = [
        {name: 'reviews'}, // make reviews a sub collection
        {name: 'address'}, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            {name: 'images'} // make images a sub collection inside dishes
          ]
        },
      ];
      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters).pipe(
        tap((item) => testDocRef = item.firestoreMetadata.ref),
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {name: 'reviews'}, // make reviews a sub collection
        {name: 'address'}, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
          subCollections: [ // sub collection inside a sub collection
            {name: 'images'} // make images a sub collection inside dishes
          ]
        },
      ];

      const newAddress: AddressItem = {
        zipCode: '55555',
        city: 'updated city',
        line1: '99 example street'
      };

      subscription = fireExt.update$<RestaurantItem>({address: newAddress}, testDocRef, subCollectionWriters).pipe(
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        tap(d => {

          expect(d).toBeTruthy();
          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);
          expect(cleanData.address).toEqual(newAddress);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('change doc id', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {name: 'reviews'}, // make reviews a sub collection
        {name: 'address'}, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
          subCollections: [ // sub collection inside a sub collection
            {name: 'images'} // make images a sub collection inside dishes
          ]
        },
      ];

      let newDocRef: DocumentReference<RestaurantItem>;

      subscription = fireExt.changeDocId$<RestaurantItem>(testDocRef, 'newId', subCollectionQueries).pipe(
        // changeDocId
        tap(d => {
          newDocRef = d.firestoreMetadata.ref;
        }),
        // Listen for doc at newDocRef
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(newDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.firestoreMetadata.id).toEqual('newId');

          const cleanData = fireExt.cleanExtrasFromData<Partial<RestaurantItem>>(d, subCollectionQueries, ['modifiedDate', 'createdDate']);
          expect(cleanData).toEqual(d);
        }),
        take(1),
        // listen for doc at old docRef..should not exist
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
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
          queryConstraints: [orderBy('index')],
        },
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.moveItemInArray$<DishItem>(originalSavedData.dishes, 0, 2, false);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well */
          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 1)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string);
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[3].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('moveItemInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.moveItemInArray$<DishItem>(originalSavedData.dishes, 0, 2, true);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = true, the given array (originalSavedData.dishes) should not have been changed
           * and will therefore not be equal the originalSavedData.dishes should instead match the original dishes */
          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 1)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string);
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[3].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemInArray$ useCopy false', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        {name: 'images'}
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.deleteIndexedItemInArray$<DishItem>(
            originalSavedData.dishes, 1, dishSubCollectionQueries, false);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well */
          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string);
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        {name: 'images'}
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.deleteIndexedItemInArray$<DishItem>(
            originalSavedData.dishes, 1, dishSubCollectionQueries, true);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = true, the given array (originalSavedData.dishes) should not have been changed and will
          * therefore not be equal the originalSavedData.dishes should instead match the original dishes */
          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 2)?.name as string);
          expect(cleanData.dishes[2].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemsInArray$ useCopy false', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        {name: 'images'}
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap(d => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.deleteIndexedItemsInArray$<DishItem>(
            originalSavedData.dishes, [1, 2], dishSubCollectionQueries, false);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well */
          expect(cleanData.dishes).toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('deleteIndexedItemsInArray$ useCopy true', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      const dishSubCollectionQueries: SubCollectionQuery[] = [
        {name: 'images'}
      ];

      let originalSavedData: FireItem<RestaurantItem>;

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),
        tap((d: FireItem<RestaurantItem>) => {
          originalSavedData = d;
        }),
        switchMap(_ => {
          return fireExt.deleteIndexedItemsInArray$<DishItem>(
            originalSavedData.dishes, [1, 2], dishSubCollectionQueries, true);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(
            d, subCollectionQueries, ['modifiedDate', 'createdDate']);

          const cleanOriginalSavedData = fireExt.cleanExtrasFromData<RestaurantItem>(
            originalSavedData, subCollectionQueries, ['modifiedDate', 'createdDate']);

          /* since we used useCopy = false, the given array (originalSavedData.dishes) should have been updated as well */
          expect(cleanData.dishes).not.toEqual(jasmine.arrayWithExactContents(cleanOriginalSavedData.dishes));

          // hard coded check of new indices
          expect(cleanData.dishes[0].name).toEqual(origData.dishes.find(dish => dish.index === 0)?.name as string);
          expect(cleanData.dishes[1].name).toEqual(origData.dishes.find(dish => dish.index === 3)?.name as string);
        }),
        take(1)
      ).subscribe(() => done());

    });

    it('updateMultiple$', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [
        {
          name: 'dishes',  // make dishes a sub collection
          queryConstraints: [orderBy('index')],
        },
      ];

      const dataToAddToEach = {
        foo: 'bar'
      };

      subscription = fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL).pipe(
        take(1),

        switchMap(d => {
          const docRefs = d.dishes.map((dish: DishItem) => (dish as FireItem<DishItem>).firestoreMetadata.ref);
          return fireExt.updateMultiple$(docRefs, dataToAddToEach);
        }),
        switchMap(_ => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_NULL);
        }),
        take(1),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.dishes).toBeTruthy();

          // d.dishes.forEach((dish: { [field: string]: any }) => {
          //   expect(dish?.foo).toBeTruthy();
          // });

        }),
        take(1)
      ).subscribe(() => done());

    });

  });

});
