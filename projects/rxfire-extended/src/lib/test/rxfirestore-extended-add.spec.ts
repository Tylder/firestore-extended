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
import {catchError, count, tap} from 'rxjs/operators';
import {of, Subscription} from 'rxjs';
import CollectionReference = firebase.firestore.CollectionReference;
import {FireItem} from '../models/firestoreItem';
import {createId, isCompleteFirestoreMetadata, isDatesExists} from './utils';
import FirebaseError = firebase.FirebaseError;

describe('RxFire Firestore Extended Add', () => {
  let app: firebase.app.App;
  let firestore: firebase.firestore.Firestore;
  let rxFireExt: RxFirestoreExtended;
  let subscription: Subscription;
  let collectionName: string = 'add'

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

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  });

  afterEach(() => {
    console.log('afterEach outer');
    subscription.unsubscribe();
    app.delete().catch();
  });

  afterAll(() => {
    console.log('afterAll outer');
  });

  describe('add$', () => {

    let testCollectionRef: CollectionReference;

    beforeEach(() => {
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`)
      console.log('beforeEach inner, path:', testCollectionRef.path);
    });

    describe('flat', () => {

      const origData = Object.assign({}, mockDeepItems[0]);
      const subCollectionWriters: SubCollectionWriter[] = [];

      it('random id no date', (done: DoneFn) => {
        // Testing add Deep with non deep data
        subscription = rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, false)
          .pipe(
            tap((d) => {

            expect(d).toBeTruthy();
            expect(isDatesExists(d)).toBeFalse()
            expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

            expect(d.reviews[0].firestoreMetadata).toBeFalsy();
            expect(d.dishes[0].firestoreMetadata).toBeFalsy();
            expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

            const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters)
            expect(cleanData).toEqual(origData)

          }),
          count(),
          tap(count => expect(count).toEqual(1)), // add should only emit once
        ).subscribe(() => {}, error => {}, () => done());
      });
      it('random id', (done: DoneFn) => {
        // Testing add Deep with non deep data
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [];

        subscription = rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true)
          .pipe (
            tap(d => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

              expect(d.reviews[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate'])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

      it('fixed id', (done: DoneFn) => {
        // Testing add Deep with non deep data

        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [];

        subscription = rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe (
            tap(d => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

              expect(d.reviews[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate'])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });
    }) // flat

    describe('deep', () => {
      it('random id', (done: DoneFn) => {
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          { name: 'reviews' }, // make reviews a sub collection
          {
            name: 'dishes',  // make dishes a sub collection
            subCollections: [ // sub collection inside a sub collection
              { name: 'images' } // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, false, )
          .pipe(
            tap(d => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeFalsy()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()
              expect(d.reviews?.length).toEqual(origData.reviews?.length);

              expect(d.reviews[0]).toBeTruthy();
              expect(d.reviews[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeTruthy();

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, [])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });
      it('fixed id with dates', (done: DoneFn) => {
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          { name: 'reviews' }, // make reviews a sub collection
          {
            name: 'dishes',  // make dishes a sub collection
            subCollections: [ // sub collection inside a sub collection
              { name: 'images' } // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap(d => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()
              expect(d.reviews?.length).toEqual(origData.reviews?.length);

              expect(d.reviews[0]).toBeTruthy();
              expect(d.reviews[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeTruthy();

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`)
              expect(d.dishes[0]?.firestoreMetadata?.path).toContain(`${testCollectionRef.path}/test/dishes/`)
              expect((d.dishes[0].images[0] as FireItem<any>).firestoreMetadata.path).toContain(`${testCollectionRef.path}/test/dishes/`)
              expect((d.dishes[0].images[0] as FireItem<any>).firestoreMetadata.path).toContain(`/images`)

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate'])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

      it('array in single doc under given docId', (done: DoneFn) => {
        // Testing add Deep with non deep data

        const origData = {
          name: 'Tonys Pizzeria and Italian Food',
          dishes: [
            {
              name: 'Margherita Pizza',
              images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
              ]
            },
            {
              name: 'Pasta alla Carbonara',
              images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
              ]
            }
          ],
        }

        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',
            docId: 'data' // causes dishes array to go in single doc called data under a dishes collection
          }
        ];

        subscription = rxFireExt.add$(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d: FireItem<any>) => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`)

              // proves that dishes is its own document
              expect(d.dishes.firestoreMetadata).toBeTruthy();
              expect(d.dishes.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/dishes/data`) // all dishes in single doc

              // cannot except d toEqual origData because using a docId on a an array of data such as dishes, causes the data
              // to become a map instead of an array and therefore break toEqual

              // rxFireExt.cleanExtrasFromData(d, subCollectionWriters, ['modifiedDate', 'createdDate'])
              // expect(d).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

      it('array as individual docs', (done: DoneFn) => {
        // Testing add Deep with non deep data

        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',
          }
        ];

        subscription = rxFireExt.add$(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d) => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`)

              const dish = d.dishes[0] as FireItem<DishItem>;

              expect(dish.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/dishes/${dish.firestoreMetadata.id}`) // stuffs in individual documents

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['createdDate', 'modifiedDate'])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

      it('docId and subcollection throw error', (done: DoneFn) => {
        // Testing add Deep with non deep data
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',  // make dishes a sub collection
            docId: 'data',
            subCollections: [ // sub collection inside a sub collection
              { name: 'images' } // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = rxFireExt.add$(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            catchError((err: FirebaseError) => {
              expect(err.code).toEqual('firestoreExt/invalid-sub-collection-writers');
              return of(err);
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

      it('subCollection is object not array', (done: DoneFn) => {
        // This causes it to use the app.defaultDocId to save the data under the given subCollection name
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'address'
          },
        ];

        subscription = rxFireExt.add$(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d) => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue()
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue()

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`)

              expect(isDatesExists(d.address)).toBeTrue()
              expect(isCompleteFirestoreMetadata((d.address as FireItem<AddressItem>).firestoreMetadata)).toBeTrue()
              expect((d.address as FireItem<AddressItem>).firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/address/${rxFireExt.defaultDocId}`)

              const cleanData = rxFireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['createdDate', 'modifiedDate'])
              expect(cleanData).toEqual(origData)
            }),
            count(),
            tap(count => expect(count).toEqual(1)), // add should only emit once
          ).subscribe(() => {}, error => {}, () => done());
      });

    }) // deep
  }) // addDeep$

});
