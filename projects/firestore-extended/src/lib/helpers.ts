import {
  Bytes,
  collection,
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  GeoPoint,
  Timestamp as FirebaseTimestamp
} from 'firebase/firestore';
import {FireItemWithDates} from './models/fireItem';

/** Helper method to get reference from path, the path can be either to a Document or Collection */
export function getRefFromPath<A>(path: string, firestore: Firestore): DocumentReference<A> | CollectionReference<A> {
  const pathSegmentAmount: number = path.split('/').length;
  if (pathSegmentAmount % 2 === 0) { // even number means doc
    return doc(firestore, path) as DocumentReference<A>;
  } else { // odd meaning collection
    return collection(firestore, path) as CollectionReference<A>;
  }
}

export function getSubCollection<T extends DocumentData, A extends DocumentData>(docRef: DocumentReference<T>,
                                                                                 collectionName: string): CollectionReference<A> {
  const collectionPath: string = docRef.path.concat('/', collectionName);
  return collection(docRef.firestore, collectionPath) as CollectionReference<A>;
}

export function getDocRefWithId<T extends DocumentData>(collectionRef: CollectionReference<T>, id: string): DocumentReference<T> {
  return doc(collectionRef.firestore, collectionRef.path, id) as DocumentReference<T>;
}

/**
 * Add data to object inplace
 * @param item item to add to
 * @param dataToAdd data to add
 * @param inplace if true the data is added inplace, if false a copy is used
 */
export function addDataToItem<A extends { [field: string]: any }>(
  item: A, dataToAdd: { [field: string]: any }, inplace = false): A {

  if (inplace) {
    Object.entries(dataToAdd).forEach(([k, v]) => {
      (item as { [field: string]: any })[k] = v;
    });
    return item;
  } else {
    return {...item, ...dataToAdd};
  }
}

/**
 * Add createdDate to the object inplace, if createdDate already exists then we do not overwrite it
 *
 * @param item item where the createdData will be added
 * @param createdDate optional, will use new Date() if none given
 * @param inplace if true the data is added inplace, if false a copy is used
 */
export function addCreatedDate<A>(item: A, inplace = false, createdDate: Date = new Date()): A {
  // do not overwrite previous createdDate
  if ('createdDate' in item) {
    return item;
  }

  return addDataToItem(item, {createdDate}, inplace);
}

/**
 * Add modifiedDate to the object
 *
 * @param item item where the modifiedDate will be added
 * @param modifiedDate optional, will use new Date() if none given
 * @param inplace if true the data is added inplace, if false a copy is used
 */
export function addModifiedDate<A>(item: A, inplace = false, modifiedDate: Date = new Date()): A {
  return addDataToItem(item, {modifiedDate}, inplace);
}

/**
 * Add createdBy to the object inplace
 *
 * @param item item to add to
 * @param createdBy profile, user or any type of data
 * @param inplace if true the data is added inplace, if false a copy is used
 */
export function addCreatedBy<A>(item: A, createdBy: { [field: string]: any }, inplace = false): A {

  return addDataToItem(item, {createdBy}, inplace);
}


/**
 * Firestore saves time as timestamps and javascript uses Date objects.
 * This functions helps convert the createdDate and modifiedDate from timestamp
 * to Date()
 *
 * inplace
 *
 * @param item item that contains 'createdDate' and/or 'modifiedDate'
 */

export function convertTimestampToDate<T extends FireItemWithDates>(item: T): T {
  if (item.hasOwnProperty('createdDate')) {
    item.createdDate = item.createdDate as FirebaseTimestamp;
    item.createdDate = item.createdDate.toDate();
  }
  if (item.hasOwnProperty('modifiedDate')) {
    item.modifiedDate = item.modifiedDate as FirebaseTimestamp;
    item.modifiedDate = item.modifiedDate.toDate();
  }

  return item;
}


/**
 * !!!! Allows for Deep Omit...its basically magic
 * Taken from https://stackoverflow.com/questions/55539387/deep-omit-with-typescript
 */


/** Union of primitives to skip with deep omit utilities. */
// tslint:disable-next-line:ban-types
export type Primitive = string | Function | number | boolean | Symbol | undefined | null;
export type FirestoreAllowedPrimitives =
  string
  | number
  | boolean
  | undefined
  | null
  | FirebaseTimestamp
  | Date
  | DocumentReference
  | GeoPoint
  | Bytes;

/* Allowed Firestore types */
export type FirestoreAllowedTypes =
  FirestoreAllowedPrimitives
  | Map<FirestoreAllowedPrimitives, FirestoreAllowedPrimitives>
  | Array<FirestoreAllowedPrimitives>;

/** Deeply omit members of an array of interface or array of type. */
export type DeepOmitArray<T extends any[], K> = {
  [P in keyof T]: DeepOmit<T[P], K>
};


export type DeepOmit<T, K> = T extends Primitive
  ? T
  : {
    [P in Exclude<keyof T, K>]: T[P] extends infer TP
      ? TP extends Primitive
        ? TP // leave primitives and functions alone
        : TP extends any[]
          ? DeepOmitArray<TP, K> // Array special handling
          : DeepOmit<TP, K>
      : never;
  };


/** Deeply omit members of an array of interface or array of type, making all members optional. */
export type PartialDeepOmitArray<T extends any[], K> = Partial<{
  [P in Partial<keyof T>]: Partial<PartialDeepOmit<T[P], K>>
}>;

/** Deeply omit members of an interface or type, making all members optional. */
export type PartialDeepOmit<T, K> = T extends Primitive ? T : Partial<{
  [P in Exclude<keyof T, K>]: // extra level of indirection needed to trigger homomorhic behavior
  T[P] extends infer TP ? // distribute over unions
    TP extends Primitive ? TP : // leave primitives and functions alone
      TP extends any[] ? PartialDeepOmitArray<TP, K> : // Array special handling
        Partial<PartialDeepOmit<TP, K>>
    : never
}>;
