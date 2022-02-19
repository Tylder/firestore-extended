import {Observable} from 'rxjs';

import {DocumentData, DocumentReference, SnapshotMetadata, Timestamp as FirebaseTimestamp} from 'firebase/firestore';
import {FirestoreAllowedTypes} from '../helpers';

// export type FirestoreItem<T = DocumentData> = T;

export type DeepFireArray<T> = {
  [P in keyof T]: FireItem<T[P]>
};

//
// /**
//  * This definition of DeepFireItem<T> assumes all non FirestoreAllowedTypes are saved as documents on firestore.
//  */
// export type DeepFireItem<T> =
//   T extends FirestoreAllowedTypes
//     ? T // do nothing to FirestoreAllowedTypes
//     : {
//       [P in keyof T]: // iterate over each key in type
//       T[P] extends infer TP // distribute over unions
//         ? TP extends FirestoreAllowedTypes // do nothing to FirestoreAllowedTypes
//           ? TP
//           : TP extends FirestoreAllowedTypes[] // do nothing to FirestoreAllowedTypes[
//             ? TP
//             : TP extends FirestoreItem[]
//               ? DeepFireArray<T[P]>
//               : TP extends FirestoreItem
//                 ? FireItem<TP> // if subtype extends FireStoreItem make it into a FireItem<TP>[]
//                 : TP
//         : T[P]
//     };

/**
 * This definition of DeepFireItem<T> assumes all non FirestoreAllowedTypes are saved as documents on firestore.
 */
export type DeepFireItem<T> =
  T extends FirestoreAllowedTypes
    ? T // do nothing to FirestoreAllowedTypes
    : {
      [P in keyof T]: // iterate over each key in type
      T[P] extends infer TP // distribute over unions
        ? TP extends FirestoreAllowedTypes // do nothing to FirestoreAllowedTypes
          ? TP
          : TP extends FirestoreAllowedTypes[] // do nothing to FirestoreAllowedTypes[
            ? TP
            : TP extends any[]
              ? DeepFireArray<T[P]>
              : FireItem<TP>
        : T[P]
    };


// export type DeepFireItem<T> =
//   T extends FirestoreAllowedTypes
//     ? T // do nothing to primitives
//     : {
//       [P in keyof T]: // iterate over each key in type
//       T[P] extends infer TP // distribute over unions
//         ? TP extends FirestoreAllowedTypes
//           ? TP
//           : TP extends FirestoreAllowedTypes[]
//             ? TP
//             : TP extends FireItem[]
//               ? DeepFireArray<T[P]>
//               : TP extends FireItem
//                 ? FireItem<TP> // if subtype extends FireStoreItem make it into a FireItem<TP>[]
//                 : TP
//         : T[P]
//     };


// export type DeepFireItem<T> =
//   T extends Primitive
//     ? T
//     : {
//       [P in keyof T]: // iterate over each key in type
//       T[P] extends infer TP // distribute over unions
//         ? TP extends { firestoreMetadata: FirestoreMetadata<TP> }
//           ? FireItem<TP>
//           : TP extends FirestoreItem[]
//             ? DeepFireArray<T[P]>
//             : TP
//         : T[P]
//     };

/**
 * Makes all types that extends FirestoreItem into a FireItem<T>. This is the type that is returned from all the
 * methods that returns the data from the database
 */
// export type FireItem<T extends FirestoreItem = FirestoreItem> = DeepFireItem<T> & { firestoreMetadata: FirestoreMetadata<T> };
export type FireItem<T extends DocumentData = DocumentData> = DeepFireItem<T> & { firestoreMetadata: FirestoreMetadata<T> };

//
// interface Bar {
//   bar: number;
// }
//
// interface Thing {
//   thing: number;
// }
//
//
// interface Foo {
//   stuff: number;
//   stuffs: number[];
//   // name: string;
//   // names: string[];
//   // bars: Bar[];
//   // bar: Bar;
//   // timestamp: FirebaseTimestamp;
//   // timestamps: FirebaseTimestamp[];
//   // thing: Thing;
//   // things: Thing[];
// }
//
// interface MockFireFoo extends FireItem<Foo> {
//   firestoreMetadata: {
//     id: string,
//     path: string,
//     isExists: boolean,
//     ref: any,
//   };
// }
//
// const bar: FireItem<Foo>;
//
// bar.stuff;
// bar.stuffs;
// bar.names;
// bar.bar;
// bar.bars;
// bar.timestamp;
// bar.timestamps;
// bar.thing;
// bar.things;
//
// const foo: MockFireFoo = {
//   stuff: 123,
//   stuffs: [123, 321],
//   firestoreMetadata: {
//     id: '1',
//     isExists: true,
//     path: 'sds',
//     ref: null
//   },
// };


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

export interface ItemWithDates {
  modifiedDate: Date | FirebaseTimestamp;
  createdDate: Date | FirebaseTimestamp;
}

/**
 * Used for documents that require indexing
 */
export interface ItemWithIndex {
  /** the index of document */
  index: number;
}

/**
 * Used for documents that require indexing and grouping
 * Meant for example when drag and drop from one indexed group to another
 */
export interface ItemWithIndexGroup extends ItemWithIndex {
  /** the groupName of document */
  groupName: string;
}

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

