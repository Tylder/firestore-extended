import {combineLatest, forkJoin, from, Observable, of} from 'rxjs';

import {catchError, filter, map, mergeMap, switchMap, take, tap} from 'rxjs/operators';
import {
  collection,
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  endAt,
  endBefore,
  FieldPath,
  Firestore,
  getDocs,
  limit,
  limitToLast,
  orderBy,
  OrderByDirection,
  query,
  Query,
  QueryConstraint,
  QuerySnapshot,
  startAfter,
  startAt,
  UpdateData,
  where,
  WhereFilterOp,
  writeBatch,
  WriteBatch
} from 'firebase/firestore';

import {
  addCreatedDate,
  addDataToItem,
  addModifiedDate,
  convertTimestampToDate,
  getDocRefWithId,
  getRefFromPath,
  getSubCollection
} from './helpers';
import {SubCollectionQuery} from './sub-collection-query';
import {BaseFirestoreWrapper, FirestoreErrorExt} from './interfaces';
import {FireItem, FirestoreMetadata, ItemWithDates, ItemWithIndex, ItemWithIndexGroup} from './models/fireItem';
import {SubCollectionWriter} from './sub-collection-writer';
import {moveItemInArray, transferArrayItem} from './drag-utils';

/**
 * Action to be taken by listener if the document does not exist.
 */
export enum DocNotExistAction {
  /** returns a null object */
  RETURN_NULL,

  /** return all the extras such as ref, path and so on but no data, kinda just ignores that the doc isn't there */
  RETURN_ALL_BUT_DATA,

  /** do not return at all until it does exist */
  FILTER,

  /** return doc not found error 'doc_not_found' */
  THROW_DOC_NOT_FOUND,
}

/** Used internally */
interface CurrentDocSubCollectionSplit {
  /** contains the document that is considered the current */
  currentDoc: FireItem;
  /** sub collections of current document */
  subCollections: { [index: string]: any };
}


/**
 * Main Class.
 *
 *
 *
 */
export class FirestoreExtended {

  /**
   * Constructor for AngularFirestoreWrapper
   *
   * @param fs Firestore wrapper Firestore extended can be used by many Firestore implementations
   * @param defaultDocId The default name given to a subCollection document when no name is given
   */
  constructor(private fs: BaseFirestoreWrapper, public defaultDocId: string = 'data') {
  }

  get firestore(): Firestore {
    return this.fs.firestore;
  }

  /* ----------  LISTEN -------------- */

  /**
   *
   * Allows for listening to documents and collections n deep up to the firestore max of 100 levels.
   *
   * Triggers for any change in any document that is listened to.
   *
   *
   * E.x:
   *      const subCollectionQueries: SubCollectionQuery[] = [
   *         { name: 'data' },
   *         { name: 'secure' },
   *         { name: 'variants' },
   *         { name: 'images',
   *           queryFn: ref => ref.orderBy('index'),
   *           collectionWithNames: [
   *             { name: 'secure'}
   *           ]
   *         },
   *     ];
   *
   *     this.listenForDocAndSubCollections<Product>(docFs, collections)
   *
   * Wrapper for listenForDocDeepRecursiveHelper$ so that we can cast the return to the correct type
   * All logic is in listenForDocDeepRecursiveHelper$.
   *
   * @param docRef - a docRef with potential queryFn
   * @param subCollectionQueries - see example
   * @param actionIfNotExist Action to take if document does not exist
   */
  public listenForDoc$<T extends DocumentData>(
    docRef: DocumentReference<T>,
    subCollectionQueries: SubCollectionQuery[] = [],
    actionIfNotExist: DocNotExistAction = DocNotExistAction.RETURN_ALL_BUT_DATA): Observable<FireItem<T>> {

    return this.listenForDocDeepRecursiveHelper$(docRef, subCollectionQueries, actionIfNotExist).pipe(
      map(data => data as FireItem<T>)
    );
  }

  /**
   * Same as AngularFirestoreCollection.snapshotChanges but it adds the properties in FirebaseDbItem.
   *
   * Important to understand this is will trigger for every change/update on any of the documents we are listening to.
   * That means that if any document we are listening to is changed the entire object will be triggered containing the updated data.
   *
   *
   *    Example usage.
   *
   *    ngFirestoreDeep: RxFirestoreExtended;  //  RxFirestoreExtended variable
   *    restaurantCollectionFs = this.ngFireStore.collection('restaurants'); // AngularFirestoreCollectionRef to restaurants
   *
   *    constructor(private ngFireStore: AngularFirestore) {
   *        this.ngFirestoreDeep = new RxFirestoreExtended(ngFireStore);  //  initialize AngularFireStoreDeep with AngularFirestore
   *    }
   *
   *    listenForRestaurants$(): Observable<RestaurantItem[]> {
   *        return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs);
   *    }
   *
   *    If you do not wish to listen for changes and only care about getting the values once
   *
   *    getRestaurants$(): Observable<RestaurantItem[]> {
   *        return this.ngFirestoreDeep.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs).pipe(
   *          take(1)
   *        );
   *    }
   *
   * @param _query the collectionRef which will be listened to
   * @param subCollectionQueries
   * @param documentChangeTypes list of DocumentChangeType that will be listened to, if null listen to all
   */
  public listenForCollection$<T extends DocumentData>(
    _query: Query<T>,
    subCollectionQueries: SubCollectionQuery[] = []): Observable<Array<FireItem<T>>> {
    /**
     * Returns an observable that will emit whenever the ref changes in any way.
     * Also adds the id and ref to the object.
     */
    return this.listenForCollectionSimple$<T>(_query).pipe(
      mergeMap((items: FireItem<T>[]) => {

        if (items == null || items.length === 0) {
          return of([]);
        }
        if (subCollectionQueries.length <= 0) {
          return of(items);
        }

        const collectionListeners: Array<Observable<any>> = [];

        items.forEach((item: FireItem<T>) => {

          const collectionListener = this.listenForCollectionsDeep<T>(item, subCollectionQueries);

          collectionListeners.push(collectionListener);
        });

        /* Finally return the combined collection listeners */
        return combineLatest(collectionListeners);
      })
    );
  }

  /**
   * Listens for collections inside collections with the same name to an unlimited depth and returns all of it as an array.
   */
  public listenForCollectionRecursively$<T extends DocumentData>(
    collectionPath: string,
    collectionKey: string,
    orderKey?: string): Observable<any> {

    // const collectionRef = getRefFromPath(collectionPath, this.fs.firestore) as CollectionReference<T>;
    const collectionQuery = new QueryContainer<T>(getRefFromPath(collectionPath, this.fs.firestore) as CollectionReference<T>);
    if (orderKey != null) {
      collectionQuery.orderBy(orderKey);
    }

    return this.listenForCollectionSimple$<T>(collectionQuery.query).pipe(
      mergeMap((items: FireItem<T>[]) => {

        if (items.length <= 0) {
          return of([]);
        } // TODO  perhaps make this throw an error so that we can skip it

        // if (items.length <= 0) { throwError('No more '); }

        const nextLevelObs: Array<Observable<FireItem<T>>> = [];

        for (const item of items) {

          // const nextLevelPath = item.firestoreMetadata.ref.collection(collectionKey).path;  // one level deeper
          const nextLevelPath = item.firestoreMetadata.ref.path.concat('/', collectionKey);  // one level deeper

          const nextLevelItems$ = this.listenForCollectionRecursively$(nextLevelPath, collectionKey, orderKey).pipe(
            map((nextLevelItems: Array<FireItem<T>>) => {
              if (nextLevelItems.length > 0) {
                return {...item, [collectionKey]: nextLevelItems} as FireItem<T>;
              } else {
                return {...item} as FireItem<T>;
              }  // dont include an empty array
            }),
          );
          nextLevelObs.push(nextLevelItems$);
        }

        return combineLatest(nextLevelObs).pipe(
          tap(val => console.log(val))
        );
      }),
    );
  }

  /* ---------- ADD -------------- */

  /**
   * Add document to firestore and split it up into sub collection.
   *
   * @param data the data to be saved
   * @param collectionRef CollectionReference reference to where on firestore the item should be saved
   * @param subCollectionWriters see documentation for SubCollectionWriter for more details on how these are used
   * @param isAddDates if true 'createdDate' and 'modifiedDate' is added to the data
   * @param docId If a docId is given it will use that specific id when saving the doc, if no docId is given a random id will be used.
   */
  public add$<T extends DocumentData>(
    data: T,
    collectionRef: CollectionReference<T>,
    subCollectionWriters: SubCollectionWriter[] = [],
    isAddDates: boolean = true,
    docId?: string): Observable<FireItem<T>> {

    if (Array.isArray(data) && docId && subCollectionWriters.length > 0) {
      const error: FirestoreErrorExt = {
        name: 'firestoreExt/invalid-sub-collection-writers',
        code: 'unknown',
        message: 'Cannot have both docId and subCollectionWriters at the same time when data is an array',
        stack: '',
        data,
        subCollectionWriters,
        docId
      };

      throw error;
    }


    let currentDoc;
    let subCollections: { [index: string]: any; } = {};

    /* if the data is an array and a docId is given the entire array will be saved in a single document with that docId,
    * Each item in the array will be saved as a map with the key being the array index
    * We still want the return value of this function to be as an array non as a map
    */
    if (Array.isArray(data) && docId) {
      currentDoc = data;
    } else {
      const split = this.splitDataIntoCurrentDocAndSubCollections(data, subCollectionWriters);
      currentDoc = split.currentDoc;
      subCollections = split.subCollections;
    }

    return this.addSimple$<T>(currentDoc as T, collectionRef, isAddDates, docId).pipe(
      /* Add Sub/sub collections*/
      mergeMap((currentData) => {

        const subWriters: Array<Observable<any>> = [];

        for (const [subCollectionKey, subCollectionValue] of Object.entries(subCollections)) {
          let subSubCollectionWriters: SubCollectionWriter[] | undefined; // undefined if no subCollectionWriters
          let subDocId: string | undefined;

          if (subCollectionWriters) {
            subSubCollectionWriters = subCollectionWriters.find(subColl => subColl.name === subCollectionKey)?.subCollections;
            subDocId = subCollectionWriters.find(subColl => subColl.name === subCollectionKey)?.docId;
          }

          const subCollectionRef: CollectionReference = getSubCollection(currentData.firestoreMetadata.ref, subCollectionKey);

          /* Handle array and object differently
          * For example if array and no docId is given it means we should save each entry as a separate doc.
          * If a docId is given we should save it using that docId under a single doc.
          * If not an array it will always be saved as a single doc, using this.defaultDocId as the default docId if none is given */
          if (Array.isArray(subCollectionValue)) {
            if (subDocId !== undefined) { /* not undefined so save it as a single doc under that docId */

              /* the pipe only matters for the return subCollectionValue not for writing the data */
              const subWriter = this.add$(subCollectionValue, subCollectionRef, subSubCollectionWriters, isAddDates, subDocId).pipe(
                map(item => {
                  // return {[key]: item};
                  return {key: subCollectionKey, value: item}; /* key and subCollectionValue as separate k,v properties */
                })
              );
              subWriters.push(subWriter);

            } else { /* docId is undefined so we save each object in the array separate */
              subCollectionValue.forEach((arrayValue: T) => {

                /* the pipe only matters for the return subCollectionValue not for writing the data */
                const subWriter = this.add$(arrayValue, subCollectionRef, subSubCollectionWriters, isAddDates).pipe(
                  map((item) => {
                    // return {[key]: [item]};
                    /* key and subCollectionValue as separate k,v properties -- subCollectionValue in an array */
                    return {key: subCollectionKey, value: [item]};
                  })
                );

                subWriters.push(subWriter);
              });
            }
          } else { /* Not an array so a single Object*/
            subDocId = subDocId !== undefined ? subDocId : this.defaultDocId;

            /* the pipe only matters for the return subCollectionValue not for writing the data */
            const subWriter = this.add$(subCollectionValue, subCollectionRef, subSubCollectionWriters, isAddDates, subDocId).pipe(
              map(item => {
                // return {[key]: item};
                return {key: subCollectionKey, value: item}; /* key and subCollectionValue as separate k,v properties */
              })
            );

            subWriters.push(subWriter);
          }
        } /* end of iteration */

        if (subWriters.length > 0) { /* if subWriters.length > 0 it means we need to handle the subWriters */

          /* the pipe only matters for the return value not for writing the data */
          return combineLatest(subWriters).pipe(
            // tap(sub => console.log(sub)),

            // TODO super duper ugly way of joining the data together but I cannot think of a better way..also it doesnt really matter.
            // TODO The ugliness only relates to how the return object looks after we add, it has no effect on how the object is saved on
            // TODO firestore.

            map((docDatas: Array<Map<string, []>>) => { /* List of sub docs*/
              const groupedData = {};

              docDatas.forEach((doc: { [indexKey: string]: any }) => { /* iterate over each doc */

                // tslint:disable-next-line:no-string-literal
                const key = doc['key'];
                // tslint:disable-next-line:no-string-literal
                const value = doc['value'];

                /* if groupedData has the key already it means that the several docs have the same key..so an array */
                // @ts-ignore
                if (groupedData.hasOwnProperty(key) && Array.isArray(groupedData[key])) {
                  /* groupedData[key] must be an array since it already exist..add this doc.value to the array */
                  // @ts-ignore
                  (groupedData[key] as Array<any>).push(value[0]);
                } else {
                  // @ts-ignore
                  groupedData[key] = value;
                }
              });

              return groupedData as T;
            }),

            // tap(groupedData => console.log(groupedData)),

            map((groupedData: T) => {
              return {...currentData, ...groupedData} as T;
            }),
            // tap(d => console.log(d)),
          );
        } else {
          return of(currentData);
        }
      })
    ).pipe(
      // @ts-ignore
      take(1)
    );
  }

  /* ----------  EDIT -------------- */

  /**
   * Update document and child documents
   *
   * Be careful when updating a document of any kind since we allow partial data there cannot be any type checking prior to update
   * so its possible to introduce spelling mistakes on attributes and so forth
   *
   * @param data the data that is to be added or updated { [field: string]: any }
   * @param docRef DocumentReference to be updated
   * @param subCollectionWriters if the data contains properties that should be placed in child collections and documents specify that here
   * @param isAddModifiedDate if true the modifiedDate property is added/updated on the affected documents
   */
  public update$<T extends DocumentData>(data: UpdateData<Partial<T>>,
                                         docRef: DocumentReference<T>,
                                         subCollectionWriters: SubCollectionWriter[] = [],
                                         isAddModifiedDate: boolean = true): Observable<void> {

    if (subCollectionWriters == null || subCollectionWriters.length === 0) {
      return this.updateSimple$(data, docRef, isAddModifiedDate); // no subCollectionWriters so just do a simple update
    }

    const batch = this.updateDeepToBatchHelper(data, docRef, subCollectionWriters, isAddModifiedDate);
    return this.batchCommit$(batch);
  }

  /**
   * Update/ add data to the firestore documents
   *
   * @param docRefs list of DocumentReference to be have their data updated
   * @param data data to add/update
   * @param isAddModifiedDate if true the modifiedDate is added/updated
   */
  public updateMultiple$<A>(docRefs: DocumentReference[], data: A, isAddModifiedDate: boolean = true): Observable<void> {
    // const batch = this.fs.firebaseApp.firestore().batch();
    const batch: WriteBatch = writeBatch(this.fs.firestore);

    if (isAddModifiedDate) {
      data = addModifiedDate(data, false);
    }

    docRefs.forEach((docRef) => {
      batch.update(docRef, data);
    });

    return this.batchCommit$(batch);
  }


  /**
   * Firestore doesn't allow you do change the name or move a doc directly so you will have to create a new doc under the new name
   * and then delete the old doc.
   * returns the new doc once the delete is done.
   *
   * @param docRef DocumentReference to have its id changed
   * @param newId the new id
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   * @param subCollectionWriters if the document has child documents the SubCollectionWriters are needed to add them back
   */
  public changeDocId$<T extends DocumentData>(docRef: DocumentReference<T>,
                                              newId: string,
                                              subCollectionQueries: SubCollectionQuery[] = [],
                                              subCollectionWriters?: SubCollectionWriter[]): Observable<FireItem<T>> {

    if (subCollectionWriters == null) {
      subCollectionWriters = subCollectionQueries as SubCollectionWriter[];
    }

    const collectionRef: CollectionReference<T> = docRef.parent;

    return this.listenForDoc$<T>(docRef, subCollectionQueries).pipe(
      // @ts-ignore
      take(1),
      map((oldData: T) => this.cleanExtrasFromData(oldData, subCollectionWriters)),
      switchMap((oldData: T) => {
        return this.add$<T>(oldData, collectionRef, subCollectionWriters, false, newId).pipe( /* add the data under id*/
          mergeMap(newData => { /* delete the old doc */
            return this.delete$(docRef, subCollectionQueries).pipe(
              map(() => newData) /* keep the new data */
            );
          }),
        );
      }),
      catchError(err => {
        console.log('Failed to Change Doc Id: ' + err);
        throw err;
      }),
      take(1),
    );

  }

  /* Move Item in Array */


  /**
   * Moved item within the same list so we need to update the index of all items in the list;
   * Use a copy if you dont wish to update the given array, for example when you want to just listen for the change of the db..
   * The reason to not do this is because it takes some time for the db to update and it looks better if the list updates immediately.
   *
   * @param items array of FireItem<A> docs with index variables to be updated
   * @param fromIndex
   * @param toIndex
   * @param useCopy if true the given array will not be updated
   */
  public moveItemInArray$<T extends DocumentData & ItemWithIndex>(items: Array<FireItem<T>>,
                                                                  fromIndex: number,
                                                                  toIndex: number,
                                                                  useCopy = false): Observable<void> {

    if (fromIndex == null || toIndex == null || fromIndex === toIndex || items.length <= 0) { // we didnt really move anything
      return of();
    }

    if (items[0]?.firestoreMetadata == null) {
      const error: FirestoreErrorExt = {
        name: 'firestoreExt/unable-to-change-index-of-non-document',
        code: 'not-found',
        message: 'The array does not appear to be a firestore document or FireItem since it lacks firestoreMetadata',
      };
      throw error;
    }

    const batch = this.getBatchFromMoveItemInIndexedDocs(items, fromIndex, toIndex, useCopy);

    return this.batchCommit$(batch);
  }

  /**
   * Does the heavy lifting when it comes to updating multiple docs to change their index.
   * Not called directly.
   *
   * @param items array of FireItem<A> docs with index variables to be updated
   * @param fromIndex
   * @param toIndex
   * @param useCopy if true the given array will not be updated
   * @protected
   */
  protected getBatchFromMoveItemInIndexedDocs<T extends DocumentData & ItemWithIndex>(items: Array<FireItem<T>>,
                                                                                      fromIndex: number,
                                                                                      toIndex: number,
                                                                                      useCopy = false): WriteBatch {

    const lowestIndex = Math.min(fromIndex, toIndex);
    const batch: WriteBatch = writeBatch(this.fs.firestore);

    if (fromIndex == null || toIndex == null || fromIndex === toIndex) { // we didnt really move anything
      return batch;
    }


    let usedItems: Array<FireItem<T>>;

    if (useCopy) {
      usedItems = Object.assign([], items);
    } else {
      usedItems = items;
    }

    moveItemInArray<FireItem<T>>(usedItems, fromIndex, toIndex);

    const listSliceToUpdate: Array<FireItem<T>> = usedItems.slice(lowestIndex);

    let i = lowestIndex;
    for (const item of listSliceToUpdate) {
      if (!useCopy) { // this is just so that the given array's index is also updated immediately
        item.index = i;
      }
      const ref = getRefFromPath(item.firestoreMetadata.path, this.fs.firestore) as DocumentReference;
      batch.update(ref, {index: i});
      i++;
    }

    return batch;
  }

  /**
   * Use when you wish to delete an indexed document and have the remaining documents update their indices to reflect the change.
   *
   * @param items array of FireItem<A> docs with index variables to be updated
   * @param indexToDelete
   * @param subCollectionQueries
   * @param useCopy
   */
  public deleteIndexedItemInArray$<T extends DocumentData & ItemWithIndex>(items: Array<FireItem<T>>,
                                                                           indexToDelete: number,
                                                                           subCollectionQueries: SubCollectionQuery[] = [],
                                                                           useCopy: boolean = false): Observable<void> {

    let usedItems: Array<FireItem<T>>;

    if (useCopy) {
      usedItems = Object.assign([], items);
    } else {
      usedItems = items;
    }

    const itemToDelete = usedItems[indexToDelete];

    // get the delete batch that also contains any sub collections of the item
    return this.getDeleteBatch$(itemToDelete.firestoreMetadata.ref, subCollectionQueries).pipe(
      map((batch) => {
        // sort and remove the item from the usedItems and then add the update index to the batch
        usedItems.sort(item => item.index); // make sure array is sorted by index
        usedItems.splice(indexToDelete, 1);

        this.getBatchFromUpdateIndexFromListOfDocs<T>(usedItems, batch);

        return batch;
      }),

      switchMap((batch) => this.batchCommit$(batch))
    );
  }

  /**
   * Use when you wish to delete several indexed documents and have the remaining documents update their indices to reflect the change.
   *
   * @param items array of FireItem<A> docs with index variables to be updated
   * @param indicesToDelete
   * @param subCollectionQueries
   * @param useCopy
   */
  public deleteIndexedItemsInArray$<T extends DocumentData & ItemWithIndex>(items: Array<FireItem<T>>,
                                                                            indicesToDelete: number[],
                                                                            subCollectionQueries: SubCollectionQuery[] = [],
                                                                            useCopy: boolean = false): Observable<void> {

    let usedItems: Array<FireItem<T>>;

    if (useCopy) {
      usedItems = Object.assign([], items);
    } else {
      usedItems = items;
    }

    usedItems.sort(item => item.index); // make sure array is sorted by index

    const itemsToDelete = usedItems.filter((item, i) => {
      return indicesToDelete.findIndex(_i => _i === i) !== -1;
    });

    // iterate in reverse so as to not change the indices,
    // the indices to delete must also be sorted
    indicesToDelete.sort();
    for (let i = indicesToDelete.length - 1; i >= 0; i--) {
      usedItems.splice(indicesToDelete[i], 1);
    }

    const docRefsObs$: Observable<DocumentReference[]>[] = [];

    // get the docRefs for items to be deleted including the ones in the subCollections
    itemsToDelete.forEach(itemToDelete => {

      const obs$ = this.getDocumentReferencesDeep$(itemToDelete.firestoreMetadata.ref, subCollectionQueries).pipe(
        take(1)
      );
      docRefsObs$.push(obs$);
    });


    return forkJoin(docRefsObs$).pipe(
      take(1),
      map((listOfDocRefs) => {
        // concat all the separate docRefs lists into one array of docRefs
        let docRefs: DocumentReference[] = [];

        listOfDocRefs.forEach(refs => {
          docRefs = docRefs.concat(refs);
        });

        return docRefs;
      }),
      map((docRefs: DocumentReference<DocumentData>[]) => this.getDeleteMultipleSimpleBatch(docRefs)),
      map((batch: WriteBatch) => this.getBatchFromUpdateIndexFromListOfDocs<T>(usedItems, batch)),
      switchMap((batch) => this.batchCommit$(batch))
    );
  }

  /**
   * Run this on collections with a fixed order using an index: number attribute;
   * This will update that index with the index in the collectionData, so it should be sorted by index first.
   * Basically needs to be run after a delete
   *
   * @param items
   * @param batch
   * @protected
   */
  protected getBatchFromUpdateIndexFromListOfDocs<T extends DocumentData & ItemWithIndex>(
    items: Array<FireItem<T>>,
    batch: WriteBatch = writeBatch(this.fs.firestore)
  ): WriteBatch {

    items.forEach((item, index) => {
      if (item.index !== index) {
        item.index = index; // this is just so that the given array's index is also updated immediately
        const ref = getRefFromPath(item.firestoreMetadata.path, this.fs.firestore) as DocumentReference;
        batch.update(ref, {index});
      }
    });

    return batch;
  }

  public transferItemInIndexedDocs<T extends DocumentData & ItemWithIndexGroup>(
    previousArray: Array<FireItem<T>>,
    currentArray: Array<FireItem<T>>,
    previousIndex: number,
    currentIndex: number,
    currentArrayName: string,
    additionalDataUpdateOnMovedItem?: { [key: string]: any },
    isUpdateModifiedDateOnMovedItem = true,
    useCopy = false): Observable<void> {

    const batch: WriteBatch = this.getBatchFromTransferItemInIndexedDocs(previousArray,
      currentArray,
      previousIndex,
      currentIndex,
      currentArrayName,
      additionalDataUpdateOnMovedItem,
      isUpdateModifiedDateOnMovedItem,
      useCopy);

    return this.batchCommit$(batch);
  }


  /* ----------  DELETE -------------- */

  /**
   * Delete Document and child documents.
   * Takes a DocumentReference and an optional list of SubCollectionQuery
   *
   * @param docRef DocumentReference that is to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public delete$(docRef: DocumentReference, subCollectionQueries: SubCollectionQuery[] = []): Observable<void> {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      // not deep so just do a normal doc delete
      return this.fs.delete(docRef);
    }

    return this.getDocumentReferencesDeep$(docRef, subCollectionQueries).pipe(
      switchMap((docRefList: DocumentReference<DocumentData>[]) => this.deleteMultipleSimple$(docRefList)),
      // catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
      //   if (err === 'Document Does not exists') { return of(); }
      //   else { throw err; }
      // }),
    );
  }

  /**
   * Returns WriteBatch that is set to delete Document and child documents of given docRef
   *
   * @param docRef DocumentReference that is to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   * @param batch
   */
  public getDeleteBatch$(docRef: DocumentReference,
                         subCollectionQueries: SubCollectionQuery[] = [],
                         batch: WriteBatch = writeBatch(this.fs.firestore)): Observable<WriteBatch> {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      // not deep so just do a normal doc delete
      batch.delete(docRef);
      return of(batch);
    }

    return this.getDocumentReferencesDeep$(docRef, subCollectionQueries).pipe(
      map((docRefs: DocumentReference<DocumentData>[]) => this.getDeleteMultipleSimpleBatch(docRefs)),
      take(1)
    );
  }

  public deleteMultipleByPaths$(docPaths: string[]): Observable<any> {
    const docRefs: DocumentReference[] =
      docPaths.map(path => getRefFromPath(path, this.fs.firestore) as DocumentReference);

    return this.deleteMultipleSimple$(docRefs);
  }

  /**
   * Delete Documents and child documents
   *
   * @param docRefs - A list of DocumentReference that are to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteMultiple$<T = FireItem>(docRefs: DocumentReference<T>[],
                                       subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      return this.deleteMultipleSimple$(docRefs);
    }

    const deepDocRefs$: Array<Observable<any>> = [];

    docRefs.forEach(docRef => {
      const docRefs$ = this.getDocumentReferencesDeep$(docRef, subCollectionQueries);
      deepDocRefs$.push(docRefs$);
    });

    return combineLatest(deepDocRefs$).pipe(
      // tap(lists => console.log(lists)),
      map((lists: any[]) => {
        let mainDocRefList: DocumentReference[] = [];
        lists.forEach(list => {
          mainDocRefList = mainDocRefList.concat(list);
        });
        return mainDocRefList;
      }),
      // tap(lists => console.log(lists)),
      switchMap((docRefList: DocumentReference[]) => this.deleteMultipleSimple$(docRefList)),
      // catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
      //   if (err === 'Document Does not exists') { return of(null); }
      //   else { throw err; }
      // })
    );
  }

  /**
   * Delete all documents and sub collections as specified in subCollectionQueries.
   * Not very efficient and causes a lot of db reads.
   * If possible use the firebase CLI or the console instead when deleting large collections.
   *
   * @param collectionRef
   * @param subCollectionQueries
   */
  public deleteCollection$<T extends DocumentData>(collectionRef: CollectionReference<T>,
                                                   subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {
    return this.getDocumentReferencesFromCollectionRef$(collectionRef, subCollectionQueries).pipe(
      switchMap((docRefs) => this.deleteMultiple$(docRefs))
    ).pipe(
      take(1)
    );
  }


  /**
   * Delete firestore document by path
   * Convenience method in case we do not have direct access to the AngularFirestoreDocument reference
   *
   * @param docPath A string representing the path of the referenced document (relative to the root of the database).
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteDocByPath$(docPath: string, subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {
    const docRef = getRefFromPath(docPath, this.fs.firestore) as DocumentReference;
    return this.delete$(docRef, subCollectionQueries);
  }

  /**
   * Delete document by FirestoreItem
   *
   * A very convenient method to remove a previously fetched document.
   * Requires that the document/Item is previously fetched since the item needs to be a FireItem, i.e. includes firestoreMetadata.
   *
   * @param item FirestoreItem to be deleted
   * @param subCollectionQueries if the document has child documents the subCollectionQueries are needed to locate them
   */
  public deleteItem$<T extends DocumentData>(item: FireItem<T>, subCollectionQueries: SubCollectionQuery[] = []): Observable<any> {

    const docRefs = this.getDocumentReferencesFromItem(item, subCollectionQueries);

    return this.deleteMultipleSimple$(docRefs).pipe(
      // catchError((err) => { // TODO super ugly and I dont know why this error is thrown..still works
      //   if (err === 'Document Does not exists') { return of(null); }
      //   else { throw err; }
      // }),
      take(1)
    );
  }


  /* ---- OTHER ---- */

  /**
   * clean FirestoreBaseItem properties from the data.
   * Usually done if you wish to save the data to firestore, since some FirestoreBaseItem properties are of non allowed types.
   *
   * Goes through each level and removes DbItemExtras
   * In case you wish to save the data
   *
   * @param data data to be cleaned, either single item or an array of items
   * @param subCollectionWriters if the document has child documents the SubCollectionWriters are needed to locate them
   * @param additionalFieldsToRemove
   */

  cleanExtrasFromData<T>(data: T & DocumentData | FireItem,
                         subCollectionWriters?: SubCollectionWriter[],
                         additionalFieldsToRemove?: string[]): T;

  cleanExtrasFromData<T>(datas: Array<T & DocumentData | FireItem>,
                         subCollectionWriters?: SubCollectionWriter[],
                         additionalFieldsToRemove?: string[]): Array<T>;

  public cleanExtrasFromData<T>(data: T & DocumentData | Array<T & DocumentData | FireItem>,
                                subCollectionWriters: SubCollectionWriter[] = [],
                                additionalFieldsToRemove: string[] = []): T | Array<T> {

    // const dataToBeCleaned = cloneDeep(data); /* clone data so we dont modify the original */
    // const dataToBeCleaned = data;

    if (Array.isArray(data)) {

      const cleanDatas: Array<T> = [];

      data.forEach(d => {
        cleanDatas.push(
          this.removeDataExtrasRecursiveHelper(d, subCollectionWriters, additionalFieldsToRemove) as T
        );
      });

      return cleanDatas;

    } else {
      return this.removeDataExtrasRecursiveHelper(data, subCollectionWriters, additionalFieldsToRemove) as T;
    }
  }


  /* ----------  PROTECTED METHODS -------------- */

  /**
   * Same as AngularFirestoreDocument.snapshotChanges but it adds the properties in FirebaseDbItem
   * and also allows for to choose action to take when document does not exist
   *
   * Important to understand this is will trigger for every change/update on the document we are listening to.
   *
   * @param docRef DocumentReference that will be listened to
   * @param actionIfNotExist Action to take if document does not exist
   */
  protected listenForDocSimple$<T extends DocumentData>(docRef: DocumentReference<any>,
                                                        actionIfNotExist: DocNotExistAction = DocNotExistAction.RETURN_ALL_BUT_DATA
  ): Observable<FireItem<T>> {

    return this.fs.listenForDoc(docRef).pipe(
      tap((snapshot: DocumentSnapshot) => {
        if (!snapshot.exists() && actionIfNotExist === DocNotExistAction.THROW_DOC_NOT_FOUND) {
          const error: FirestoreErrorExt = {
            name: 'FirebaseErrorExt',
            code: 'not-found',
            message: 'Document not found and actionIfNotExist is set to THROW_DOC_NOT_FOUND',
            docRef
          };
          throw error;
        }
      }),

      filter((snapshot: DocumentSnapshot) => {
        return !(!snapshot.exists() && actionIfNotExist === DocNotExistAction.FILTER);
      }),
      map((snapshot: DocumentSnapshot) => {

        if (snapshot.exists() || actionIfNotExist === DocNotExistAction.RETURN_ALL_BUT_DATA) {
          const data = snapshot.data() as T;

          const firestoreMetadata: FirestoreMetadata<T> = {
            id: snapshot.id,
            ref: snapshot.ref as DocumentReference<T>,
            path: docRef.path,
            isExists: snapshot.exists(),
            snapshotMetadata: snapshot.metadata
          };

          return {...data, firestoreMetadata} as FireItem<T>;

        } else if (actionIfNotExist === DocNotExistAction.RETURN_NULL) { /* doc doesn't exist */
          return null;
        }
        return null;
      }),
      map((data) => {
        if (data != null) {
          return convertTimestampToDate(data as T);
        } else {
          return data;
        }
      }),
    ) as Observable<FireItem<T>>;
  }

  /**
   * Listens for single collection and returns an array of documents as FireItem<T>[]
   * Used internally, please use listenForCollection$() instead.
   *
   * @param _query the Query which will be listened to
   * @protected
   */
  protected listenForCollectionSimple$<T extends DocumentData>(_query: Query<T>): Observable<Array<FireItem<T>>> {
    /**
     * Returns an observable that will emit whenever the ref changes in any way.
     * Also adds the id and ref to the object.
     */
    return this.fs.listenForCollection(_query).pipe(
      map((snap: QuerySnapshot<T>) => {
        return snap.docs.map(snapshot => {
          const data = snapshot.data() as T;

          const id = snapshot.id;
          const ref = snapshot.ref as DocumentReference<T>;
          const path = ref.path;
          const snapshotMetadata = snapshot.metadata;

          const firestoreMetadata: FirestoreMetadata<T> = {
            id,
            path,
            ref,
            snapshotMetadata,
            isExists: true
          };

          return {...data, firestoreMetadata} as FireItem<T>;
        });
      }),
      map((datas: Array<FireItem<T>>) => datas.map((data) => {
        if (data.hasOwnProperty('createdDate') || data.hasOwnProperty('modifiedDate')) {
          convertTimestampToDate(data as unknown as FireItem<T> & ItemWithDates);
        }
        return data;
      }))
    ) as Observable<Array<FireItem<T>>>;
  }

  /**
   * Used internally for both listenForDoc and listenForCollection in order to recursively get collections.
   *
   * Please use listenForDoc or listenForCollection.
   *
   * @param item
   * @param subCollectionQueries
   * @protected
   */
  protected listenForCollectionsDeep<T extends DocumentData>(
    item: FireItem<T>,
    subCollectionQueries: SubCollectionQuery[] = []): Observable<FireItem<T>[]> {

    if (item == null) {
      return of([item]);
    }
    if (subCollectionQueries.length <= 0) {
      return of([item]);
    }

    const collectionListeners: Array<Observable<any>> = [];

    /* Iterate over each sub collection we have given and create collection listeners*/
    subCollectionQueries.forEach(subCollectionQuery => {

      const queryContainer = new QueryContainer(getSubCollection(item.firestoreMetadata.ref, subCollectionQuery.name));
      if (subCollectionQuery.queryConstraints) {
        queryContainer.queryConstraints = subCollectionQuery.queryConstraints;
        // collectionRef = subCollectionQuery.queryFn(collectionRef) as CollectionReference;
      }
      // if (subCollectionQuery.queryFn) {
      //   collectionRef = subCollectionQuery.queryFn(collectionRef) as CollectionReference;
      // }

      const collectionListener = this.listenForCollectionSimple$(queryContainer.query).pipe(
        // filter(docs => docs.length > 0), // skip empty collections or if the subCollectionQuery doesnt exist
        /* Uncomment to see data on each update */
        // tap(d => console.log(d)),
        // filter(docs => docs != null),
        /* Listen For and Add any Potential Sub Docs*/
        // @ts-ignore // TODO fix this so that I can remove the ts-ignore
        mergeMap((items: FireItem[]) => {

          if (!subCollectionQuery.subCollections) {
            return of(items);
          }

          const docListeners: Array<Observable<any>> = [];

          items = items.filter(d => d != null); // filter out potential nulls

          items.forEach((subItem: FireItem) => {
            const subDocAndCollections$ = this.listenForCollectionsDeep(subItem, subCollectionQuery.subCollections);
            docListeners.push(subDocAndCollections$);
          });

          if (docListeners.length <= 0) {
            return of([]);
          } /* subCollectionQuery is empty or doesnt exist */

          return combineLatest(docListeners).pipe(
            // tap(val => console.log(val))
          );
        }), /* End of Listening for sub docs */
        /* If docs.length === 1 and the id is defaultDocId or the given docId it means we are in a sub subCollectionQuery
        and we only care about the data. So we remove the array and just make it one object with the
        subCollectionQuery name as key and docs[0] as value */
        map((items: FireItem<T>[]) => {
          const docId = subCollectionQuery.docId !== undefined ? subCollectionQuery.docId : this.defaultDocId;

          if (items.length === 1 && items[0].firestoreMetadata.id === docId) {
            return {[subCollectionQuery.name]: items[0]};
          } else {
            return {[subCollectionQuery.name]: items};
          }
        }),
        // tap(d => console.log(d)),
      );

      collectionListeners.push(collectionListener);
    });

    /* Finally return the combined collection listeners*/
    // @ts-ignore
    return combineLatest(collectionListeners).pipe(
      // map((collectionDatas: { [collectionKeyName: string]: FirestoreItem<FirestoreItem<{}>>[] }[]) => {
      //   map((collectionDatas) => {
      map((collectionDatas: { [collectionKeyName: string]: FireItem[] }[]) => {
        const datasMap: { [field: string]: any } = {};

        collectionDatas.forEach((collectionData) => {

          for (const [collectionName, items] of Object.entries(collectionData)) {
            datasMap[collectionName] = items;
          }
        });
        return datasMap;
      }),

      map((data: DocumentData) => {
        return {...item, ...data} as T;
      }),
    );
  }

  /**
   * DO NOT CALL THIS METHOD, meant to be used solely by listenForDocAndSubCollections$
   */
  protected listenForDocDeepRecursiveHelper$<T extends DocumentData>(
    docRef: DocumentReference<T>,
    subCollectionQueries: SubCollectionQuery[] = [],
    actionIfNotExist: DocNotExistAction = DocNotExistAction.RETURN_NULL): Observable<any> {

    /* Listen for the docFs*/
    return this.listenForDocSimple$<T>(docRef, actionIfNotExist).pipe(
      mergeMap((item: FireItem<T>) => {

        if (item === null) {
          return of(item);
        }
        if (subCollectionQueries.length <= 0) {
          return of(item);
        }

        return this.listenForCollectionsDeep(item, subCollectionQueries);
      })
    );
  }

  /**
   * A replacement/extension to the AngularFirestoreCollection.add.
   * Does the same as AngularFirestoreCollection.add but can also add createdDate and modifiedDate and returns
   * the data with the added properties in FirebaseDbItem
   *
   * Used internally
   *
   * @param data the data to be added to the document, cannot contain types firestore won't allow
   * @param collectionRef the CollectionReference where the document should be added
   * @param isAddDates if true adds modifiedDate and createdDate to the data
   * @param id if given the added document will be given this id, otherwise a random unique id will be used.
   */
  protected addSimple$<T extends DocumentData>(data: T, collectionRef: CollectionReference<T>, isAddDates: boolean = true, id?: string):
    Observable<FireItem<T>> {

    // let dataToBeSaved: A = Object.assign({}, data);

    let res$: Observable<any>;

    if (isAddDates) {
      const date = new Date();
      data = addCreatedDate(data, false, date);
      data = addModifiedDate(data, false, date);
    }

    if (id !== undefined) {
      const docRef: DocumentReference = getDocRefWithId(collectionRef, id);
      res$ = this.fs.set(docRef, data);
    } else {
      res$ = this.fs.add<T>(collectionRef, data);
    }

    // if (Array.isArray(data) && isAddDates) {
    //   data = data.map(item => {
    //     return {...item, modifiedDate: dataToBeSaved.modifiedDate, createdData: dataToBeSaved.createdData }
    //   })
    // }

    res$ = res$.pipe(
      // tap(() => this.snackBar.open('Success', 'Added', {duration: 1000})),
      // tap(ref => console.log(ref)),
      // tap(() => console.log(data)),
      map((ref: DocumentReference<T> | undefined) => {
        if (id === undefined && ref) {

          const path = ref.path;

          const firestoreMetadata: FirestoreMetadata<T> = {
            id: ref.id,
            path,
            ref,
            isExists: true
          };

          return {...data, firestoreMetadata} as FireItem<T>;

        } else { // if id is defined it means we used docRef.set and ref is undefined
          const path = collectionRef.path + '/' + id;
          ref = getRefFromPath(path, this.fs.firestore) as DocumentReference<T>;

          const firestoreMetadata: FirestoreMetadata<T> = {
            id: id as string,
            ref,
            path,
            isExists: true
          };

          return {...data, firestoreMetadata} as FireItem<T>;
        }
      }),
    );

    return res$.pipe(
      take(1)
    );
  }

  /** Used internally for updates that doesn't affect child documents */
  protected updateSimple$<T>(data: UpdateData<Partial<T>>,
                             docRef: DocumentReference<T>,
                             isAddModifiedDate: boolean = true): Observable<void> {

    if (isAddModifiedDate) {
      data = addModifiedDate(data, false);
    }
    return this.fs.update<T>(docRef, data);
  }

  /**
   * DO NOT CALL THIS METHOD, used by update deep
   */
  protected updateDeepToBatchHelper<T extends DocumentData>(data: UpdateData<T>,
                                                            docRef: DocumentReference<T>,
                                                            subCollectionWriters: SubCollectionWriter[] = [],
                                                            isAddModifiedDate: boolean = true,
                                                            batch?: WriteBatch): WriteBatch {

    if (batch === undefined) {
      batch = writeBatch(this.fs.firestore);
    }

    if (isAddModifiedDate) {
      data = addModifiedDate(data, false);
    }

    const split = this.splitDataIntoCurrentDocAndSubCollections(data, subCollectionWriters);
    const currentDoc = split.currentDoc as UpdateData<T>;
    const subCollections = split.subCollections;

    // console.log(currentDoc, subCollections);
    batch.update(docRef, currentDoc);

    for (const [subCollectionKey, subDocUpdateValue] of Object.entries(subCollections)) {

      let subSubCollectionWriters: SubCollectionWriter[] | undefined; // undefined if no subCollectionWriters
      let subDocId: string | undefined;

      if (subCollectionWriters) {
        subSubCollectionWriters = subCollectionWriters.find(subColl => subColl.name === subCollectionKey)?.subCollections;
        subDocId = subCollectionWriters.find(subColl => subColl.name === subCollectionKey)?.docId;
      }

      subDocId = subDocId !== undefined ? subDocId : this.defaultDocId; /* Set default if none given */

      // const subDocFs = docRef.collection(subCollectionKey).doc(subDocId);
      const subCollection = getSubCollection(docRef, subCollectionKey);
      const subDocFs = getDocRefWithId(subCollection, subDocId);

      batch = this.updateDeepToBatchHelper(subDocUpdateValue, subDocFs, subSubCollectionWriters, isAddModifiedDate, batch);
    }

    return batch;
  }

  /**
   * Used mainly for drag and drop scenarios where we drag an item from one list to another and the the docs
   * have an index value and a groupName.
   *
   * @param previousArray
   * @param currentArray
   * @param previousIndex
   * @param currentIndex
   * @param currentArrayName
   * @param additionalDataUpdateOnMovedItem
   * @param isUpdateModifiedDateOnMovedItem
   * @param useCopy
   * @protected
   */
  protected getBatchFromTransferItemInIndexedDocs<T extends DocumentData & ItemWithIndexGroup>(
    previousArray: Array<FireItem<T>>,
    currentArray: Array<FireItem<T>>,
    previousIndex: number,
    currentIndex: number,
    currentArrayName: string,
    additionalDataUpdateOnMovedItem?: { [key: string]: any },
    isUpdateModifiedDateOnMovedItem = true,
    useCopy = false): WriteBatch {

    let usedPreviousArray: Array<FireItem<T>>;
    let usedCurrentArray: Array<FireItem<T>>;
    if (useCopy) {
      usedPreviousArray = Object.assign([], previousArray);
      usedCurrentArray = Object.assign([], currentArray);
    } else {
      usedPreviousArray = previousArray;
      usedCurrentArray = currentArray;
    }

    transferArrayItem(usedPreviousArray, usedCurrentArray, previousIndex, currentIndex);

    const batch: WriteBatch = writeBatch(this.fs.firestore);

    if (additionalDataUpdateOnMovedItem !== undefined) {
      const movedItem = usedCurrentArray[currentIndex];
      const movedItemRef = movedItem.firestoreMetadata.ref;

      const data = {...additionalDataUpdateOnMovedItem, groupName: currentArrayName};

      if (!useCopy) {
        addDataToItem(movedItem, data, true);
      }

      if (isUpdateModifiedDateOnMovedItem) {
        const date = new Date();
        addModifiedDate(data, true, date);

        if (!useCopy) {
          addModifiedDate(movedItem, true, date);
        }
      }
      batch.update(movedItemRef, data);
    }

    const currentArraySliceToUpdate: Array<FireItem<T>> = usedCurrentArray.slice(currentIndex);
    let i = currentIndex;
    for (const item of currentArraySliceToUpdate) {
      // @ts-ignore
      batch.update(item.firestoreMetadata.ref, {index: i});

      if (!useCopy) {
        item.index = i;
      }

      i++;
    }

    const prevArraySliceToUpdate: Array<FireItem<T>> = usedPreviousArray.slice(previousIndex);
    i = previousIndex;
    for (const item of prevArraySliceToUpdate) {
      // @ts-ignore
      batch.update(item.firestoreMetadata.ref, {index: i});

      if (!useCopy) {
        item.index = i;
      }

      i++;
    }

    return batch;
  }


  /**
   * Delete Documents
   *
   * @param docRefs - A list of DocumentReference that are to be deleted
   */
  protected deleteMultipleSimple$(docRefs: DocumentReference[]): Observable<void> {

    const batch = this.getDeleteMultipleSimpleBatch(docRefs);

    return this.batchCommit$(batch);
  }

  protected getDeleteMultipleSimpleBatch(docRefs: DocumentReference[], batch: WriteBatch = writeBatch(this.fs.firestore)): WriteBatch {

    docRefs.forEach((docRef) => {
      batch.delete(docRef);
    });

    return batch;
  }

  /**
   * Recursive method to clean FirestoreBaseItem properties from the dbItem
   *
   * @param dbItem the data to be cleaned
   * @param subCollectionWriters list of SubCollectionWriters to handle sub collections
   * @param additionalFieldsToRemove
   */
  protected removeDataExtrasRecursiveHelper<T extends DocumentData>(dbItem: T,
                                                                    subCollectionWriters: SubCollectionWriter[] = [],
                                                                    additionalFieldsToRemove: string[] = []): T {

    // const extraPropertyNames: string[] = Object.getOwnPropertyNames(new DbItemExtras());
    const extraPropertyNames: string[] = ['firestoreMetadata'].concat(additionalFieldsToRemove);

    /* Current level delete */
    for (const extraPropertyName of extraPropertyNames) {
      delete dbItem[extraPropertyName];
    }

    subCollectionWriters.forEach(col => {
      if (Array.isArray(dbItem[col.name])) { /* property is array so will contain multiple docs */

        const docs: T[] = dbItem[col.name];
        docs.forEach((d, i) => {

          if (col.subCollections) {
            this.removeDataExtrasRecursiveHelper(d, col.subCollections, additionalFieldsToRemove);
          } else {
            /*  */
            for (const extraPropertyName of extraPropertyNames) {
              delete dbItem[col.name][i][extraPropertyName];
            }
          }
        });

      } else { /* not an array so a single doc*/

        if (col.subCollections) {
          this.removeDataExtrasRecursiveHelper(dbItem[col.name], col.subCollections, additionalFieldsToRemove);
        } else {
          for (const extraPropertyName of extraPropertyNames) {
            delete dbItem[col.name][extraPropertyName];
          }
        }

      }
    });

    return dbItem;

  }

  /**
   * Returns an Observable containing a list of DocumentReference found under the given docRef using the SubCollectionQuery[]
   * Mainly used to delete a docFs and its sub docs
   * @param ref: DocumentReference | CollectionReference
   * @param subCollectionQueries: SubCollectionQuery[]
   */
  protected getDocumentReferencesDeep$(ref: DocumentReference | CollectionReference,
                                       subCollectionQueries: SubCollectionQuery[] = []):
    Observable<DocumentReference[]> {

    if (ref instanceof DocumentReference) {
      return this.getDocumentReferencesFromDocRef$<FireItem>(ref as DocumentReference<FireItem>, subCollectionQueries);
    } else { // CollectionReference
      return this.getDocumentReferencesFromCollectionRef$(ref as CollectionReference<FireItem>, subCollectionQueries);
    }
  }

  protected getDocumentReferencesFromDocRef$<T extends FireItem>(docRef: DocumentReference<T>,
                                                                 subCollectionQueries: SubCollectionQuery[] = []):
    Observable<DocumentReference[]> {

    return this.listenForDoc$<T>(docRef, subCollectionQueries).pipe(
      take(1),
      map((item: FireItem<T>) => this.getPathsFromItemDeepRecursiveHelper(item, subCollectionQueries)),
      // tap(pathList => console.log(pathList)),
      map((pathList: string[]) => {
        return pathList
          .map(path => getRefFromPath(path, this.fs.firestore) as DocumentReference);
      }),
      // tap(item => console.log(item)),
    );
  }

  protected getDocumentReferencesFromCollectionRef$<T extends DocumentData>(collectionRef: CollectionReference<T>,
                                                                            subCollectionQueries: SubCollectionQuery[] = []):
    Observable<DocumentReference[]> {

    return this.listenForCollectionSimple$(collectionRef).pipe(
      // @ts-ignore
      take(1),
      mergeMap((items: FireItem[]) => {
        let docListeners: Array<Observable<any>>;
        docListeners = items.map(item => this.listenForDoc$(item.firestoreMetadata.ref, subCollectionQueries));
        return combineLatest(docListeners);
      }),
      map((items: FireItem[]) => {

        let paths: string[] = [];

        items.forEach(item => {
          paths = paths.concat(this.getPathsFromItemDeepRecursiveHelper(item, subCollectionQueries));
        });
        return paths;
      }),
      map((pathList: string[]) => {
        return pathList
          .map(path => getRefFromPath(path, this.fs.firestore) as DocumentReference);
      }),
    );
  }

  /**
   * Used by deleteDeepByItem$ to get all the AngularFirestoreDocuments to be deleted
   * including child documents using SubCollectionQueries
   *
   * Internal use
   * @param item FirestoreItem from where we get the AngularFirestoreDocuments
   * @param subCollectionQueries if the dbItem has child documents the subCollectionQueries are needed to locate them
   */
  protected getDocumentReferencesFromItem<T extends DocumentData>(
    item: FireItem<T>,
    subCollectionQueries: SubCollectionQuery[] = []): DocumentReference[] {

    const paths = this.getPathsFromItemDeepRecursiveHelper(item, subCollectionQueries);
    return paths.map(path => getRefFromPath(path, this.fs.firestore) as DocumentReference);
  }

  /**
   * DO NOT CALL THIS METHOD, its meant as a support method for getDocs$
   */
  protected getPathsFromItemDeepRecursiveHelper<T extends FireItem>(item: T,
                                                                    subCollectionQueries: SubCollectionQuery[] = []): string[] {

    if (subCollectionQueries == null || subCollectionQueries.length === 0) {
      return [item.firestoreMetadata.path];
    }
    let pathList: string[] = [];
    pathList.push(item.firestoreMetadata.path);

    subCollectionQueries.forEach(col => {
      if (Array.isArray((item as DocumentData)[col.name]) && !col.docId) {
        /* property is array and not using docId so will contain multiple docs */

        const items: T[] = (item as DocumentData)[col.name];
        items.forEach(subItem => {

          if (col.subCollections) {
            pathList = pathList.concat(this.getPathsFromItemDeepRecursiveHelper(subItem, col.subCollections));
          } else {
            pathList.push(subItem.firestoreMetadata.path);
          }
        });

      } else { /* not an array so a single doc*/

        if (col.subCollections) {
          pathList = pathList.concat(this.getPathsFromItemDeepRecursiveHelper(item, col.subCollections));
        } else {
          const subItem = ((item as DocumentData)[col.name] as FireItem);
          if (subItem != null && 'path' in subItem.firestoreMetadata) {
            pathList.push(subItem.firestoreMetadata.path);
          }
          // const path = (dbItem[col.name] as FirestoreItem).path;
        }

      }
    });

    return pathList;
  }

  /**
   * DO  NOT  CALL THIS METHOD, used in addDeep and updateDeep to split the data into currentDoc and subCollections
   * Only goes one sub level deep;
   */
  protected splitDataIntoCurrentDocAndSubCollections<T>(
    data: T,
    subCollectionWriters: SubCollectionWriter[] = []): CurrentDocSubCollectionSplit {

    /* Split data into current doc and sub collections */
    let currentDoc: { [index: string]: any; } = {};
    const subCollections: { [index: string]: any; } = {};

    /* Check if the key is in subCollections, if it is place it in subCollections else place it in currentDoc */

    // not array so object
    for (const [key, value] of Object.entries(data)) {
      // console.log(key, value);
      if (subCollectionWriters && subCollectionWriters.length > 0) {
        const subCollectionWriter: SubCollectionWriter | undefined = subCollectionWriters.find(subColl => subColl.name === key);

        if (subCollectionWriter) {
          subCollections[key] = value;
        } else {
          currentDoc[key] = value;
        }
      } else {
        currentDoc = data;
      }
    }


    return {
      currentDoc,
      subCollections
    } as CurrentDocSubCollectionSplit;
  }

  /**
   * Turn a batch into an Observable instead of Promise.
   *
   * For some reason angularfire returns a promise on batch.commit() instead of an observable like for
   * everything else.
   *
   * This method turns it into an observable
   */
  protected batchCommit$(batch: WriteBatch): Observable<void> {
    return from(batch.commit()).pipe(
      take(1)
    );
  }
}


/**
 * Firebase version 9 changed the query syntax
 * The new syntax broken the ability to chain queries like this:
 *
 * collectionRef.where('foo', '==', 123).limit(10)..returns the collection ref
 *
 * now instead you must write it like this, query(collectionRef, where('foo', '==', 123), limit(10))...returns a Query
 *
 * which is ugly and make you loose the information that was present in the collectionRef since a Query is returned instead,
 * which holds less information than a CollectionReference.
 *
 * This Container is meant to allow you to chain queries, like before version 9 and also retain the information in
 * the original CollectionReference
 */
export class QueryContainer<T> {

  public queryConstraints: QueryConstraint[] = [];

  constructor(public ref: CollectionReference<T>) {
  }

  /** factory method to create container from path */
  static fromPath<T>(firestore: Firestore, path: string): QueryContainer<T> {
    const ref = collection(firestore, path) as CollectionReference<T>;
    return new this(ref);
  }

  /** Returns the query with all the query constraints */
  get query(): Query<T> {
    return query(this.ref, ...this.queryConstraints);
  }

  /** Calls the firebase getDocs() method and listens for the documents in the query. */
  getDocs$(): Observable<QuerySnapshot<T>> {
    return from(getDocs<T>(this.query));
  }

  where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: unknown): QueryContainer<T> {
    this.queryConstraints.push(where(fieldPath, opStr, value));
    return this;
  }

  orderBy(fieldPath: string | FieldPath, directionStr?: OrderByDirection): QueryContainer<T> {
    this.queryConstraints.push(orderBy(fieldPath, directionStr));
    return this;
  }

  limit(_limit: number): QueryContainer<T> {
    this.queryConstraints.push(limit(_limit));
    return this;
  }

  limitToLast(_limit: number): QueryContainer<T> {
    this.queryConstraints.push(limitToLast(_limit));
    return this;
  }

  startAt(...fieldValues: unknown[]): QueryContainer<T>; // definition
  startAt(snapshot?: DocumentSnapshot<unknown>): QueryContainer<T>; // definition

  startAt(snapshot?: DocumentSnapshot<unknown>, ...fieldValues: unknown[]): QueryContainer<T> { // implementation
    if (snapshot) {
      this.queryConstraints.push(startAt(snapshot));
    } else if (fieldValues) {
      this.queryConstraints.push(startAt(...fieldValues));
    }
    return this;
  }

  startAfter(...fieldValues: unknown[]): QueryContainer<T>; // definition
  startAfter(snapshot?: DocumentSnapshot<unknown>): QueryContainer<T>; // definition

  startAfter(snapshot?: DocumentSnapshot<unknown>, ...fieldValues: unknown[]): QueryContainer<T> { // implementation
    if (snapshot) {
      this.queryConstraints.push(startAfter(snapshot));
    } else if (fieldValues) {
      this.queryConstraints.push(startAfter(...fieldValues));
    }
    return this;
  }

  endAt(...fieldValues: unknown[]): QueryContainer<T>; // definition
  endAt(snapshot?: DocumentSnapshot<unknown>): QueryContainer<T>; // definition

  endAt(snapshot?: DocumentSnapshot<unknown>, ...fieldValues: unknown[]): QueryContainer<T> { // implementation
    if (snapshot) {
      this.queryConstraints.push(endAt(snapshot));
    } else if (fieldValues) {
      this.queryConstraints.push(endAt(...fieldValues));
    }
    return this;
  }

  endBefore(...fieldValues: unknown[]): QueryContainer<T>; // definition
  endBefore(snapshot?: DocumentSnapshot<unknown>): QueryContainer<T>; // definition

  endBefore(snapshot?: DocumentSnapshot<unknown>, ...fieldValues: unknown[]): QueryContainer<T> { // implementation
    if (snapshot) {
      this.queryConstraints.push(endBefore(snapshot));
    } else if (fieldValues) {
      this.queryConstraints.push(endBefore(...fieldValues));
    }
    return this;
  }

}
