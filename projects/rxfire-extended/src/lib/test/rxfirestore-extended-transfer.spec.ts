import {
  default as TEST_PROJECT,
  firestoreEmulatorPort,
} from './config';
import {RxFirestoreExtended} from '../rxfirestore-extended';
import {mockDragAndDropItems} from './mock/mockItems';
import firebase from 'firebase/app';
import 'firebase/firestore';

import {SubCollectionWriter} from '../sub-collection-writer';
import { DishItem,} from './models/restaurant';
import { delay, switchMap, take, tap} from 'rxjs/operators';
import {forkJoin, Observable, Subscription} from 'rxjs';
import CollectionReference = firebase.firestore.CollectionReference;
import {createId, } from './utils';
import {FireItem} from '../models/firestoreItem';
import {DragAndDropItem} from './models/groupItem';
import {combineLatestToObject} from '../combine-latest-to-object';

describe('RxFire Firestore Extended transferItemInIndexedDocs', () => {
  let app: firebase.app.App;
  let firestore: firebase.firestore.Firestore;
  let rxFireExt: RxFirestoreExtended;
  let subscription: Subscription;
  let collectionName: string = 'transfer'

  let testCollectionRef: CollectionReference;
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
    app = firebase.initializeApp(TEST_PROJECT, createId());
    firestore = app.firestore();
    firestore.useEmulator('localhost', firestoreEmulatorPort);
    rxFireExt = new RxFirestoreExtended(app);  //  initialize RxFireStoreExtended with firestore

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000000;

    // DATA

    const subCollectionWriters: SubCollectionWriter[] = [
      {
        name: 'items'
      }
    ]
    origData = mockDragAndDropItems.map(d => Object.assign({}, d));
    testCollectionRef = firestore.collection(`${collectionName}_${createId()}`)
    console.log('beforeEach inner, path:', testCollectionRef.path);

    const addObs$: Observable<any>[] = []

    origData.forEach(data => {
      const obs$ = rxFireExt.add$<DragAndDropItem>(data, testCollectionRef, subCollectionWriters, true, )
      addObs$.push(obs$);
    })

    forkJoin(addObs$).pipe(
      take(1)
    ).subscribe(() => done());

  });

  afterEach(() => {
    console.log('afterEach outer');
    subscription.unsubscribe();
    app.delete().catch();
  });

  afterAll(() => {
    console.log('afterAll outer');
  });


  it('useCopy = false, update modifiedDate', (done: DoneFn) => {

    let collectionA = firestore.collection(testCollectionRef.path)
    collectionA = collectionA.where('groupName', '==', 'A')
      .orderBy('index', 'desc') as CollectionReference

    let collectionB = firestore.collection(testCollectionRef.path)
    collectionB = collectionB.where('groupName', '==', 'B')
      .orderBy('index', 'desc') as CollectionReference

    let originalSavedDataA: FireItem<DishItem>[];
    let originalSavedDataB: FireItem<DishItem>[];

    subscription = combineLatestToObject({
      a: rxFireExt.listenForCollection$<DishItem>(collectionA),
      b: rxFireExt.listenForCollection$<DishItem>(collectionB),
    }).pipe(
      take(1),
      tap((d) => {
        originalSavedDataA = d.a;
        originalSavedDataB = d.b;
      }),
      delay(2000), // so that we can see if modifiedDate gets updated
      switchMap((d) => { // move from A to B and from index 0 to 2
        return rxFireExt.transferItemInIndexedDocs(
          d.a as FireItem<any>, d.b  as FireItem<any>, 0, 2,
          'B', {}, true, false)
      }),
      switchMap((d) => {
        return combineLatestToObject({
          a: rxFireExt.listenForCollection$<DishItem>(collectionA),
          b: rxFireExt.listenForCollection$<DishItem>(collectionB),
        })
      }),
      tap((d) => {
        expect(d).toBeTruthy();
        expect(d.a).toBeTruthy();
        expect(d.b).toBeTruthy();

        expect(d.a.length).toEqual(2)
        expect(d.b.length).toEqual(3)

        const cleanA = rxFireExt.cleanExtrasFromData<DishItem>(d.a,[], ['modifiedDate', 'createdDate'])
        const cleanB = rxFireExt.cleanExtrasFromData<DishItem>(d.b,[], ['modifiedDate', 'createdDate'])

        const cleanSavedDataA = rxFireExt.cleanExtrasFromData<DishItem>(originalSavedDataA,[], ['modifiedDate', 'createdDate'])
        const cleanSavedDataB = rxFireExt.cleanExtrasFromData<DishItem>(originalSavedDataB,[], ['modifiedDate', 'createdDate'])

        expect(cleanA).toEqual(jasmine.arrayWithExactContents(cleanSavedDataA))
        expect(cleanB).toEqual(jasmine.arrayWithExactContents(cleanSavedDataB))
      }),
    ).subscribe(() => done())
  });

  it('useCopy = true, update modifiedDate', (done: DoneFn) => {

    let collectionA = firestore.collection(testCollectionRef.path)
    collectionA = collectionA.where('groupName', '==', 'A')
      .orderBy('index', 'desc') as CollectionReference

    let collectionB = firestore.collection(testCollectionRef.path)
    collectionB = collectionB.where('groupName', '==', 'B')
      .orderBy('index', 'desc') as CollectionReference

    let originalSavedDataA: FireItem<DishItem>[];
    let originalSavedDataB: FireItem<DishItem>[];

    subscription = combineLatestToObject({
      a: rxFireExt.listenForCollection$<DishItem>(collectionA),
      b: rxFireExt.listenForCollection$<DishItem>(collectionB),
    }).pipe(
      take(1),
      tap((d) => {
        originalSavedDataA = d.a;
        originalSavedDataB = d.b;
      }),
      delay(2000), // so that we can see if modifiedDate gets updated
      switchMap((d) => { // move from A to B and from index 0 to 2
        return rxFireExt.transferItemInIndexedDocs(
          d.a as FireItem<any>, d.b  as FireItem<any>, 0, 2,
          'B', {}, true, true)
      }),
      switchMap((d) => {
        return combineLatestToObject({
          a: rxFireExt.listenForCollection$<DishItem>(collectionA),
          b: rxFireExt.listenForCollection$<DishItem>(collectionB),
        })
      }),
      tap((d) => {
        expect(d).toBeTruthy();
        expect(d.a).toBeTruthy();
        expect(d.b).toBeTruthy();

        expect(d.a.length).toEqual(2)
        expect(d.b.length).toEqual(3)

        const cleanA = rxFireExt.cleanExtrasFromData<DishItem>(d.a,[], ['modifiedDate', 'createdDate'])
        const cleanB = rxFireExt.cleanExtrasFromData<DishItem>(d.b,[], ['modifiedDate', 'createdDate'])

        const cleanSavedDataA = rxFireExt.cleanExtrasFromData<DishItem>(originalSavedDataA,[], ['modifiedDate', 'createdDate'])
        const cleanSavedDataB = rxFireExt.cleanExtrasFromData<DishItem>(originalSavedDataB,[], ['modifiedDate', 'createdDate'])

        expect(cleanA).not.toEqual(jasmine.arrayWithExactContents(cleanSavedDataA))
        expect(cleanB).not.toEqual(jasmine.arrayWithExactContents(cleanSavedDataB))
      }),
    ).subscribe(() => done())
  });


});
