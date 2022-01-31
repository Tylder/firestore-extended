import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {mockDeepItems} from './mock/mockItems';
import {deleteApp, FirebaseApp, initializeApp} from 'firebase/app';

import {SubCollectionWriter} from '../sub-collection-writer';
import {AddressItem, RestaurantItem} from './models/restaurant';
import {catchError, count, tap} from 'rxjs/operators';
import {of, Subscription} from 'rxjs';
import {FireItem} from '../models/fireItem';
import {createId, isCompleteFirestoreMetadata, isDatesExists} from './utils';
import {collection, CollectionReference, connectFirestoreEmulator, Firestore, FirestoreError, getFirestore} from 'firebase/firestore';
import {FirestoreExt} from '../firestore-extended.class';

describe('Firestore Extended Add', () => {
  let app: FirebaseApp;
  let firestore: Firestore;
  let fireExt: FirestoreExt;
  let subscription: Subscription;
  const collectionName: string = 'add';

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

  describe('add$', () => {

    let testCollectionRef: CollectionReference<RestaurantItem>;

    beforeEach(() => {
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);
    });

    describe('flat', () => {

      const origData: RestaurantItem = Object.assign({}, mockDeepItems[0]);
      const subCollectionWriters: SubCollectionWriter[] = [];

      it('random id no date', (done: DoneFn) => {
        // Testing add Deep with non deep data
        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, false)
          .pipe(
            tap((d: FireItem<RestaurantItem>) => {
              const foo = d.address?.firestoreMetadata?.ref;
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeFalse();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.reviews[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters);
              expect(cleanData).toEqual(origData);

            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });
      it('random id', (done: DoneFn) => {
        // Testing add Deep with non deep data
        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true)
          .pipe(
            tap(d => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.reviews[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate']);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

      it('fixed id', (done: DoneFn) => {
        // Testing add Deep with non deep data

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap(d => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.reviews[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].firestoreMetadata).toBeFalsy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeFalsy();

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate']);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });
    }); // flat

    describe('deep', () => {
      it('random id', (done: DoneFn) => {
        const origData: RestaurantItem = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {name: 'reviews'}, // make reviews a sub collection
          {
            name: 'dishes',  // make dishes a sub collection
            subCollections: [ // sub collection inside a sub collection
              {name: 'images'} // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, false)
          .pipe(
            tap((d: FireItem<RestaurantItem>) => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeFalsy();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();
              expect(d.reviews['length']).toEqual(origData['reviews']?.length);

              expect(d.reviews[0]).toBeTruthy();
              expect(d.reviews[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeTruthy();

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, []);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });
      it('fixed id with dates', (done: DoneFn) => {
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {name: 'reviews'}, // make reviews a sub collection
          {
            name: 'dishes',  // make dishes a sub collection
            subCollections: [ // sub collection inside a sub collection
              {name: 'images'} // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d: FireItem<RestaurantItem>) => {
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();
              expect(d.reviews['length']).toEqual(origData['reviews']?.length);

              expect(d.reviews[0]).toBeTruthy();
              expect(d.reviews[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].firestoreMetadata).toBeTruthy();
              expect(d.dishes[0].images[0].firestoreMetadata).toBeTruthy();

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`);
              expect(d.dishes[0]?.firestoreMetadata?.path).toContain(`${testCollectionRef.path}/test/dishes/`);
              expect(d.dishes[0].images[0].firestoreMetadata.path).toContain(`${testCollectionRef.path}/test/dishes/`);
              expect(d.dishes[0].images[0].firestoreMetadata.path).toContain(`/images`);

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['modifiedDate', 'createdDate']);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

      it('array in single doc under given docId', (done: DoneFn) => {
        // Testing add Deep with non deep data

        const origData: RestaurantItem = {
          address: {
            zipCode: '123',
            city: 'sds',
            line1: '123',
          },
          averageReviewScore: 0,
          category: '',
          reviews: [],
          name: 'Tonys Pizzeria and Italian Food',
          dishes: [
            {
              index: 0,
              name: 'Margherita Pizza',
              images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
              ]
            },
            {
              index: 1,
              name: 'Pasta alla Carbonara',
              images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
              ]
            }
          ]
        };

        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',
            docId: 'data' // causes dishes array to go in single doc called data under a dishes collection
          }
        ];

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d) => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`);

              const dishes: FireItem = d.dishes as any;
              // proves that dishes is its own document
              expect(dishes.firestoreMetadata).toBeTruthy();
              expect(dishes.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/dishes/data`); // all dishes in single doc

              // cannot except d toEqual origData because using a docId on a an array of data such as dishes, causes the data
              // to become a map instead of an array and therefore break toEqual

              // rxFireExt.cleanExtrasFromData(d, subCollectionWriters, ['modifiedDate', 'createdDate'])
              // expect(d).toEqual(origData)
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

      it('array as individual docs', (done: DoneFn) => {
        // Testing add Deep with non deep data

        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',
          }
        ];

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d) => {

              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`);

              const dish = d.dishes[0];

              // stuffs in individual documents
              expect(dish.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/dishes/${dish.firestoreMetadata.id}`);

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['createdDate', 'modifiedDate']);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

      it('docId and subcollection throw error', (done: DoneFn) => {
        // Testing add Deep with non deep data
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'dishes',  // make dishes a sub collection
            docId: 'data',
            subCollections: [ // sub collection inside a sub collection
              {name: 'images'} // make images a sub collection inside dishes
            ]
          },
        ];

        subscription = fireExt.add$(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            catchError((err: FirestoreError) => {
              expect(err.name).toEqual('firestoreExt/invalid-sub-collection-writers');
              return of(err);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

      it('subCollection is object not array', (done: DoneFn) => {
        // This causes it to use the app.defaultDocId to save the data under the given subCollection name
        const origData = Object.assign({}, mockDeepItems[0]);
        const subCollectionWriters: SubCollectionWriter[] = [
          {
            name: 'address'
          },
        ];

        subscription = fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, 'test')
          .pipe(
            tap((d) => {
              expect(d).toBeTruthy();
              expect(isDatesExists(d)).toBeTrue();
              expect(isCompleteFirestoreMetadata(d.firestoreMetadata)).toBeTrue();

              expect(d.firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test`);

              expect(isDatesExists(d.address)).toBeTrue();
              expect(isCompleteFirestoreMetadata((d.address as (AddressItem & FireItem)).firestoreMetadata)).toBeTrue();
              expect((d.address as (AddressItem & FireItem)).firestoreMetadata.path).toEqual(`${testCollectionRef.path}/test/address/${fireExt.defaultDocId}`);

              const cleanData = fireExt.cleanExtrasFromData<RestaurantItem>(d, subCollectionWriters, ['createdDate', 'modifiedDate']);
              expect(cleanData).toEqual(origData);
            }),
            count(),
            tap(_count => expect(_count).toEqual(1)), // add should only emit once
          ).subscribe(() => {
          }, error => {
          }, () => done());
      });

    }); // deep
  }); // addDeep$

});
