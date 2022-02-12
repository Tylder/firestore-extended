import {FireItem, FirestoreMetadata} from '../models/fireItem';

export function isCompleteFirestoreMetadata(metadata: FirestoreMetadata<any>): boolean {
  return 'id' in metadata &&
    'path' in metadata &&
    'ref' in metadata &&
    'isExists' in metadata;
}


export function isDatesExists(data: FireItem<any>): boolean {
  return 'modifiedDate' in data &&
    'createdDate' in data;
}

export function createId(): string {
  return Math.random().toString(36).substring(5);
}
