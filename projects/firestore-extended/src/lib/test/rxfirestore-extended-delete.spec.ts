import {
  default as TEST_PROJECT,
  firestoreEmulatorPort,
} from './config';
import {RxFirestoreExtended} from '../rxfirestore-extended';
import {mockDeepItems, mockDragAndDropItems, mockSimpleItems} from './mock/mockItems';
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
import {DragAndDropItem} from './models/groupItem';

describe('RxFire Firestore Extended Delete', () => {
  let app: firebase.app.App;
  let firestore: firebase.firestore.Firestore;
  let rxFireExt: RxFirestoreExtended;
  let subscription: Subscription;
  let collectionName: string = 'delete'

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

  describe('delete$ shallow', () => {
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

      const subCollectionQueries: SubCollectionQuery[] = []

      subscription = rxFireExt.delete$(testDocRef, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_ALL_BUT_DATA)
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
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];
      origData = Object.assign({}, mockDeepItems[0]);
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

      subscription = rxFireExt.delete$(testDocRef, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForDoc$<RestaurantItem>(testDocRef, subCollectionQueries, DocNotExistAction.RETURN_ALL_BUT_DATA)
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
    let testDocRef: DocumentReference;
    let origData: Readonly<RestaurantItem>[];

    beforeEach((done: DoneFn) => {
      const subCollectionWriters: SubCollectionWriter[] = []
      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = []

      origData.forEach(data => {
        const obs$ = rxFireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true, )
        addObs$.push(obs$);
      })

      forkJoin(addObs$).pipe(
        take(1)
      ).subscribe(() => done());

    });

    it('simple', (done: DoneFn) => {

      const subCollectionQueries: SubCollectionQuery[] = []

      subscription = rxFireExt.deleteCollection$(testCollectionRef, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries)
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0)
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
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];

      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = []

      origData.forEach(data => {
        const obs$ = rxFireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true, )
        addObs$.push(obs$);
      })

      forkJoin(addObs$).pipe(
        take(1)
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

      subscription = rxFireExt.deleteCollection$(testCollectionRef, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries)
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0)
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
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];

      origData = mockDeepItems.map(d => Object.assign({}, d));
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      const addObs$: Observable<any>[] = []

      origData.forEach(data => {
        const obs$ = rxFireExt.add$<RestaurantItem>(data, testCollectionRef, subCollectionWriters, true, ).pipe(
          tap(d => docRefs.push(d.firestoreMetadata.ref))
        )
        addObs$.push(obs$);
      })

      forkJoin(addObs$).pipe(
        take(1),
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

      subscription = rxFireExt.deleteMultiple$(docRefs, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries)
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0)
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
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];

      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, ).pipe(
        tap(d => docPath = d.firestoreMetadata.path)
      ).subscribe(() => done())

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

      subscription = rxFireExt.deleteDocByPath$(docPath, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries)
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0)
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
        { name: 'reviews' }, // make reviews a sub collection
        { name: 'address' }, // make address a sub collection
        {
          name: 'dishes',  // make dishes a sub collection
          subCollections: [ // sub collection inside a sub collection
            { name: 'images' } // make images a sub collection inside dishes
          ]
        },
      ];

      origData = Object.assign({}, mockDeepItems[0]);
      testCollectionRef = firestore.collection(`${collectionName}_${createId()}`) as CollectionReference<RestaurantItem>
      console.log('beforeEach inner, path:', testCollectionRef.path);

      rxFireExt.add$<RestaurantItem>(origData, testCollectionRef, subCollectionWriters, true, ).pipe(
        tap(d => item = d)
      ).subscribe(() => done())

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

      subscription = rxFireExt.deleteItem$(item, subCollectionQueries).pipe(
        switchMap(() => {
          return rxFireExt.listenForCollection$<RestaurantItem>(testCollectionRef, subCollectionQueries)
        }),
        tap(d => {
          expect(d).toBeTruthy();
          expect(d.length).toEqual(0)
        }),
        take(1)
      ).subscribe(() => done());

    });

  });

});
