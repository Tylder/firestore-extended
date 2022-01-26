import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {mockDeepItems} from './mock/mockItems';

import {SubCollectionWriter} from '../sub-collection-writer';
import {RestaurantItem} from './models/restaurant';
import {switchMap, take, tap} from 'rxjs/operators';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {SubCollectionQuery} from '../sub-collection-query';
import {DocNotExistAction} from '../firestore-extended';
import {createId} from './utils';
import {FireItem} from '../models/firestoreItem';
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

describe('Firestore Extended Delete', () => {
  let app: FirebaseApp;
  let firestore: Firestore;
  let fireExt: FirestoreExt;
  let subscription: Subscription;
  const collectionName: string = 'delete';

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

  describe('delete$ shallow', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference;
    let origData: Readonly<RestaurantItem>;

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [];
      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true).pipe(
        tap((item) => testDocRef = item.firestoreMetadata.ref),
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [];

      subscription = fireExt.delete$(testDocRef, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_ALL_BUT_DATA);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.firestoreMetadata.isExists).toBeFalse();
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('delete$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let testDocRef: DocumentReference;
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

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true).pipe(
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

      subscription = fireExt.delete$(testDocRef, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_ALL_BUT_DATA);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.firestoreMetadata.isExists).toBeFalse();
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('deleteCollection$ shallow', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>[];

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [];
      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = [];

      origData.forEach(data => {
        const obs$ = fireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true);
        addObs$.push(obs$);
      });

      forkJoin(addObs$).pipe(
        take(1)
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = [];

      subscription = fireExt.deleteCollection$(testCollectionRef, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0);
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('deleteCollection$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>[];

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [
        {name: 'reviews'}, // make reviews a sub collection
        {name: 'address'}, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            {name: 'images'} // make images a sub collection inside dishes
          ]
        },
      ];

      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = [];

      origData.forEach(data => {
        const obs$ = fireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true);
        addObs$.push(obs$);
      });

      forkJoin(addObs$).pipe(
        take(1)
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

      subscription = fireExt.deleteCollection$(testCollectionRef, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0);
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('deleteMultiple$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>[];
    const docRefs: DocumentReference[] = [];

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [
        {name: 'reviews'}, // make reviews a sub collection
        {name: 'address'}, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            {name: 'images'} // make images a sub collection inside dishes
          ]
        },
      ];

      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>;
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = [];

      origData.forEach(data => {
        const obs$ = fireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true).pipe(
          tap(d => docRefs.push(d.firestoreMetadata.ref))
        );
        addObs$.push(obs$);
      });

      forkJoin(addObs$).pipe(
        take(1),
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

      subscription = fireExt.deleteMultiple$(docRefs, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0);
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('deleteDocByPath$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>;
    let docPath: string;

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [
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

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true).pipe(
        tap(d => docPath = d.firestoreMetadata.path)
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

      subscription = fireExt.deleteDocByPath$(docPath, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0);
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

  describe('deleteItem$ deep', () => {
    let testCollectionRef: CollectionReference<RestaurantItem>;
    let origData: Readonly<RestaurantItem>;
    let item: FireItem<RestaurantItem>;

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = [
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

      fireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true).pipe(
        tap(d => item = d)
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

      subscription = fireExt.deleteItem$(item, subCollectionQueries).pipe(
        switchMap(() => {
          return fireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries);
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0);
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

});
