import {Observable} from 'rxjs';

import {DocumentData, DocumentReference, SnapshotMetadata, Timestamp as FirebaseTimestamp} from 'firebase/firestore';
import {Primitive} from '../helpers';


/** The object returned by most FirestoreExtended methods,
 * containing the database data and the additional data from FireStoreItem
 */

export type FireStoreItem<T = DocumentData> = T & {
  // firestoreMetadata?: FirestoreMetadata<T>;
};


// /** Mark some properties as required, leaving others unchanged */
export type MarkRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
// export type DeepMarkRequiredArray<T, K extends keyof T> = {
//   // @ts-ignore
//   [P in keyof T]: DeepMarkRequired<T[P], K>
// };

export type DeepFireArray<T> = {
  [P in keyof T]: FireItem<T[P]>
};


// export type DeepMarkRequired<T, K extends keyof T> = T extends Primitive
//   ? T
//   : {
//   [P in keyof T]: T[P] extends { 'firestoreMetadata'?: FirestoreMetadata }
//     ? T & Required<Pick<T, K>>
//     : T extends { 'firestoreMetadata'?: FirestoreMetadata }[]
//       ? DeepMarkRequiredArray<T, K>
//       : T;
//   // @ts-ignore
// } & Required<Pick<T, 'firestoreMetadata'>>;

// export type DeepMarkRequired<T, K extends keyof T> =
//   T extends Primitive
//     ? T
//     : {
//       [P in keyof T]:
//       T[P] extends infer TP // distribute over unions
//         ? TP extends FireStoreItem
//           // @ts-ignore
//           ? DeepMarkRequired<TP & Required<Pick<TP, K>>, K>
//           : TP extends FireStoreItem[]
//             // @ts-ignore
//             ? DeepMarkRequiredArray<TP, K>
//             : TP
//         : T[P]
//     };

export type DeepFireItem<T> =
  T extends Primitive
    ? T
    : {
      [P in keyof T]:
      T[P] extends infer TP // distribute over unions
        ? TP extends FireStoreItem
          ? FireItem<TP>
          : TP extends FireStoreItem[]
            ? DeepFireArray<TP>
            : TP
        : T[P]
    };


// export type FireItem<T extends FireStoreItem> = Omit<T, 'firestoreMetadata'> & Required<Pick<T, 'firestoreMetadata'>>;
// export type FireItem<T extends FireStoreItem> = T & Required<Pick<T, 'firestoreMetadata'>>;
// export type FireItem<T extends FireStoreItem = FireStoreItem> =
//   DeepMarkRequired<T, 'firestoreMetadata'> & Required<Pick<T, 'firestoreMetadata'>>;
/**
 * Makes all types that extends FirestoreItem into a FireItem<T>. This is the type that is returned from all the
 * methods that returns the data from the database
 */
export type FireItem<T extends FireStoreItem = FireStoreItem> = DeepFireItem<T> & { firestoreMetadata: FirestoreMetadata<T> };

// export type FireItem<T extends FireStoreItem> = T & {
//   firestoreMetadata: FirestoreMetadata<T>;
// };
//
// interface Foo extends FireStoreItem {
//   testFoo: string;
// }
//
// interface Bar extends FireStoreItem {
//   testBar: number;
//   foo: Foo;
//
//   foo2: Foo[];
// }

/**
 * The base object of all firestore documents, containing additional data for
 * easy and efficient document edits.
 *
 * All properties are optional so that we can we can implement this without adding the values.
 * The properties are added when getting the document from firestore.
 */
export interface FirestoreMetadata<T = DocumentData> {

  /** The id of the Firestore document */
  id: string;
  /** The path to the firestore document */
  path: string;
  /** The firestore document reference */
  ref: DocumentReference<T>;

  /** allows for simple and clear checks if the document exists.
   * Only applies when DocNotExistAction.RETURN_ALL_BUT_DATA is used when listening for documents
   * @link DocNotExistAction
   */
  isExists: boolean;

  snapshotMetadata?: SnapshotMetadata;
}

export interface FireItemWithDates {
  modifiedDate?: Date | FirebaseTimestamp;
  createdDate?: Date | FirebaseTimestamp;
}

/**
 * Used for documents that require indexing
 */
export interface FireItemWithIndex {
  /** the index of document */
  index: number;
}

/**
 * Used for documents that require indexing and grouping
 * Meant for example when drag and drop from one indexed group to another
 */
export interface FireItemWithIndexGroup extends FireItemWithIndex {
  /** the groupName of document */
  groupName: string;
}

// /**
//  * Used for documents that require indexing
//  */
// export interface FirestoreMetadataWithIndex<T> extends FirestoreMetadata<T> {
//   /** the index of document */
//   index: number;
// }
//
// export interface FirestoreItemWIndex extends FirestoreItem {
//   firestoreMetadata: FirestoreMetadataWithIndex<this>;
// }

/**
 * Used to save the storagePath of items in Firebase Storage
 */
export interface StorageItem {
  /** the Firebase storage path */
  storagePath: string;
}

/** Firestore data for image stored on Firebase Storage */
export interface ImageItem extends StorageItem {
  /** The title of the image */
  title: string;
  /** Filename including extension */
  fileName: string;
  /** Firebase storage url */
  url: string;
  /** Firebase storage url to use for thumbnails */
  thumbUrl: string;
  /** the <img alt=""> */
  alt?: string;
  /** Firebase storage url that is available to be listened to immediately */
  url$?: Observable<string>;
  /** Firebase storage url that is available to be listened to immediately to use for thumbnails */
  thumbUrl$?: Observable<string>;
}

