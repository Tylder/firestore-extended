import {Observable} from 'rxjs';
import firebase from 'firebase/app';
import 'firebase/firestore';
import Timestamp = firebase.firestore.Timestamp;
import DocumentReference = firebase.firestore.DocumentReference;
import SnapshotMetadata = firebase.firestore.SnapshotMetadata;
import DocumentData = firebase.firestore.DocumentData;

/** The object returned by most FirestoreExtended methods,
* containing the database data and the additional data from FireStoreItem */
export type FireItem<T = DocumentData> = T & {
  firestoreMetadata: FirestoreMetadata<T>;

  modifiedDate?: Date | Timestamp;
  createdDate?: Date | Timestamp;
}

/**
 * Any data that will be saved as a doc to firestore should extend this interface.
 */
export interface FirestoreItem {
  firestoreMetadata?: FirestoreMetadata<this>;
  /** the Date when the document was created or last modified */
  modifiedDate?: Date | Timestamp;
  /** The Date when the document was created */
  createdDate?: Date | Timestamp;
}

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

  snapshotMetadata?: SnapshotMetadata
}


/**
 * Used for documents that require indexing
 */
export interface FirestoreMetadataWithIndex<T> extends FirestoreMetadata<T> {
  /** the index of document */
  index: number;
}

export interface FirestoreItemWIndex extends FirestoreItem {
  firestoreMetadata?: FirestoreMetadataWithIndex<this>;
}
/**
 * Used to save the storagePath of items in Firebase Storage
 */
export interface StorageItem {
  /** the Firebase storage path */
  storagePath: string;
}

/**
 * Firestore data for image stored on Firebase Storage
 */
export interface ImageItem  {
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
