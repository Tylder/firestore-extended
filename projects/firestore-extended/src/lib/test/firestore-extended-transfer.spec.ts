import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {mockDragAndDropItems} from './mock/mockItems';

import {SubCollectionWriter} from '../sub-collection-writer';
import {DishItem} from './models/restaurant';
import {delay, switchMap, take, tap} from 'rxjs/operators';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {createId} from './utils';
import {FireItem} from '../models/fireItem';
import {DragAndDropItem} from './models/groupItem';
import {combineLatestToObject} from '../rxjs-ops/combine-latest-to-object';
import {deleteApp, FirebaseApp, initializeApp} from 'firebase/app';
import {collection, CollectionReference, connectFirestoreEmulator, Firestore, getFirestore} from 'firebase/firestore';
import {FirestoreExt} from '../firestore-extended.class';
import {QueryContainer} from '../firestore-extended';

describe('Firestore Extended transferItemInIndexedDocs', () => {
  let app: FirebaseApp;
  let firestore: Firestore;
  let fireExt: FirestoreExt;
  let subscription: Subscription;
  const collectionName: string = 'transfer';

  let testCollectionRef: CollectionReference<DragAndDropItem>;
  let origData: Readonly<DragAndDropItem[]>;

  /**
   * Each test runs inside it's own app instance and the app
   * is deleted after the test runs.
   *
   * Each test is responsible for seeding and removing data. Helper
   * functions are useful if the process becomes brittle or tedious.
   * Note that removing is less necessary since the test are run
   * against the emulator
   */
  beforeEach((done: DoneFn) => {
    console.log('beforeEach outer');
    app = initializeApp(TEST_PROJECT, createId());
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, 'localhost', firestoreEmulatorPort);
    fireExt = new FirestoreExt(app);  //  initialize FirestoreExtClass with firestore

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000;

    // DATA

    const subCollectionWriters: SubCollectionWriter[] = [
      {
        name: 'items'
      }
    ];
    origData = mockDragAndDropItems.map(d => Object.assign({}, d));
    testCollectionRef = collection(firestore, `${collectionName}_${createId()}`) as CollectionReference<DragAndDropItem>;
    console.log('beforeEach inner, path:', testCollectionRef.path);

    const addObs$: Observable<any>[] = [];

    origData.forEach(data => {
      const obs$ = fireExt.add$<DragAndDropItem>(data, testCollectionRef, subCollectionWriters);
      addObs$.push(obs$);
    });

    forkJoin(addObs$).pipe(
      take(1)
    ).subscribe(() => done());

  });

  afterEach(() => {
    console.log('afterEach outer');
    subscription.unsubscribe();
    deleteApp(app).catch();
  });

  afterAll(() => {
    console.log('afterAll outer');
  });


  it('useCopy = false, update modifiedDate', (done: DoneFn) => {

    const queryContainerA = QueryContainer.fromPath<DragAndDropItem>(firestore, testCollectionRef.path)
      .where('groupName', '==', 'A')
      .orderBy('index', 'desc');

    const queryContainerB = QueryContainer.fromPath<DragAndDropItem>(firestore, testCollectionRef.path)
      .where('groupName', '==', 'B')
      .orderBy('index', 'desc');

    let originalSavedDataA: DragAndDropItem[];
    let originalSavedDataB: DragAndDropItem[];

    subscription = combineLatestToObject({
      a: fireExt.listenForCollection$<DragAndDropItem>(queryContainerA.query),
      b: fireExt.listenForCollection$<DragAndDropItem>(queryContainerB.query),
    }).pipe(
      take(1),
      tap((d) => {
        originalSavedDataA = d.a;
        originalSavedDataB = d.b;
      }),
      delay(2000), // so that we can see if modifiedDate gets updated
      switchMap((d) => { // move from A to B and from index 0 to 2
        return fireExt.transferItemInIndexedDocs(
          d.a, d.b, 0, 2,
          'B', {}, true, false);
      }),
      switchMap((_) => {
        return combineLatestToObject({
          a: fireExt.listenForCollection$<DragAndDropItem>(queryContainerA.query),
          b: fireExt.listenForCollection$<DragAndDropItem>(queryContainerB.query),
        });
      }),
      tap((d) => {
        expect(d).toBeTruthy();
        expect(d.a).toBeTruthy();
        expect(d.b).toBeTruthy();

        expect(d.a.length).toEqual(2);
        expect(d.b.length).toEqual(3);

        const cleanA = fireExt.cleanExtrasFromData<DishItem>(d.a, [], ['modifiedDate', 'createdDate']);
        const cleanB = fireExt.cleanExtrasFromData<DishItem>(d.b, [], ['modifiedDate', 'createdDate']);

        const cleanSavedDataA = fireExt.cleanExtrasFromData<DragAndDropItem>(originalSavedDataA, [], ['modifiedDate', 'createdDate']);
        const cleanSavedDataB = fireExt.cleanExtrasFromData<DragAndDropItem>(originalSavedDataB, [], ['modifiedDate', 'createdDate']);

        expect(cleanA).toEqual(jasmine.arrayWithExactContents(cleanSavedDataA));
        expect(cleanB).toEqual(jasmine.arrayWithExactContents(cleanSavedDataB));
      }),
    ).subscribe(() => done());
  });

  it('useCopy = true, update modifiedDate', (done: DoneFn) => {

    const queryContainerA = QueryContainer.fromPath<DishItem>(firestore, testCollectionRef.path)
      .where('groupName', '==', 'A')
      .orderBy('index', 'desc');

    const queryContainerB = QueryContainer.fromPath<DishItem>(firestore, testCollectionRef.path)
      .where('groupName', '==', 'B')
      .orderBy('index', 'desc');

    let originalSavedDataA: FireItem<DishItem>[];
    let originalSavedDataB: FireItem<DishItem>[];

    subscription = combineLatestToObject({
      a: fireExt.listenForCollection$<DishItem>(queryContainerA.query),
      b: fireExt.listenForCollection$<DishItem>(queryContainerB.query),
    }).pipe(
      take(1),
      tap((d) => {
        originalSavedDataA = d.a;
        originalSavedDataB = d.b;
      }),
      delay(2000), // so that we can see if modifiedDate gets updated
      switchMap((d) => { // move from A to B and from index 0 to 2
        return fireExt.transferItemInIndexedDocs(
          d.a as FireItem<any>, d.b as FireItem<any>, 0, 2,
          'B', {}, true, true);
      }),
      switchMap((_) => {
        return combineLatestToObject({
          a: fireExt.listenForCollection$<DishItem>(queryContainerA.query),
          b: fireExt.listenForCollection$<DishItem>(queryContainerB.query),
        });
      }),
      tap((d) => {
        expect(d).toBeTruthy();
        expect(d.a).toBeTruthy();
        expect(d.b).toBeTruthy();

        expect(d.a.length).toEqual(2);
        expect(d.b.length).toEqual(3);

        const cleanA = fireExt.cleanExtrasFromData<DishItem>(d.a, [], ['modifiedDate', 'createdDate']);
        const cleanB = fireExt.cleanExtrasFromData<DishItem>(d.b, [], ['modifiedDate', 'createdDate']);

        const cleanSavedDataA = fireExt.cleanExtrasFromData<DishItem>(originalSavedDataA, [], ['modifiedDate', 'createdDate']);
        const cleanSavedDataB = fireExt.cleanExtrasFromData<DishItem>(originalSavedDataB, [], ['modifiedDate', 'createdDate']);

        expect(cleanA).not.toEqual(jasmine.arrayWithExactContents(cleanSavedDataA));
        expect(cleanB).not.toEqual(jasmine.arrayWithExactContents(cleanSavedDataB));
      }),
    ).subscribe(() => done());
  });


});
