import {FirebaseApp, initializeApp} from 'firebase/app';
import {default as TEST_PROJECT, firestoreEmulatorPort} from './config';
import {createId} from './utils';
import {addCreatedBy, addCreatedDate, addDataToItem, addModifiedDate, convertTimestampToDate, getRefFromPath} from '../helpers';
import {
  CollectionReference,
  connectFirestoreEmulator,
  DocumentReference,
  Firestore,
  getFirestore,
  Timestamp as FirebaseTimestamp
} from 'firebase/firestore';

describe('Helpers', () => {

  let app: FirebaseApp;
  let firestore: Firestore;

  beforeEach(() => {
    app = initializeApp(TEST_PROJECT, createId());
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, 'localhost', firestoreEmulatorPort);

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });

  it('getRefFromPath document', () => {
    const path = 'test/123';

    const ref = getRefFromPath(path, firestore);

    expect(ref).toBeTruthy();
    expect(ref).toBeInstanceOf(DocumentReference);
  });

  it('getRefFromPath collection', () => {
    const path = 'test';

    const ref = getRefFromPath(path, firestore);

    expect(ref).toBeTruthy();
    expect(ref).toBeInstanceOf(CollectionReference);
  });

  it('addDataToItem inplace', () => {
    const data: { [field: string]: any } = {test: 123};

    addDataToItem(data, {
      thing: 'foo'
    }, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['thing']).toBeTruthy();
    expect(data['thing']).toEqual('foo');

  });


  it('addDataToItem inplace false', () => {
    let data: { [field: string]: any } = {test: 123};

    data = addDataToItem(data, {
      thing: 'foo'
    }, false);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['thing']).toBeTruthy();
    expect(data['thing']).toEqual('foo');
  });

  it('addCreatedDate no date given', () => {
    const data: { [field: string]: any } = {test: 123};

    addCreatedDate(data, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['createdDate']).toBeTruthy();
    expect(data['createdDate']).toBeInstanceOf(Date);
  });

  it('addCreatedDate date given', () => {
    const data: { [field: string]: any } = {test: 123};

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);

    addCreatedDate(data, true, date);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['createdDate']).toBeTruthy();
    expect(data['createdDate']).toBeInstanceOf(Date);
    expect(data['createdDate']).toBe(date);
  });

  it('addCreatedDate no date given, try to overwrite', () => {

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);
    const data: { [field: string]: any } = {
      test: 123,
      createdDate: date
    };

    addCreatedDate(data, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['createdDate']).toBeTruthy();
    expect(data['createdDate']).toBeInstanceOf(Date);
    expect(data['createdDate']).toBe(date);
  });

  it('addModifiedDate no date given', () => {
    const data: { [field: string]: any } = {test: 123};

    addModifiedDate(data, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['modifiedDate']).toBeTruthy();
    expect(data['modifiedDate']).toBeInstanceOf(Date);
  });

  it('addModifiedDate date given', () => {
    const data: { [field: string]: any } = {test: 123};

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);

    addModifiedDate(data, true, date);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['modifiedDate']).toBeTruthy();
    expect(data['modifiedDate']).toBeInstanceOf(Date);
    expect(data['modifiedDate']).toBe(date);
  });

  it('addModifiedDate no date given, overwrite', () => {

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);
    const data: { [field: string]: any } = {
      test: 123,
      modifiedDate: date
    };

    addModifiedDate(data, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['modifiedDate']).toBeTruthy();
    expect(data['modifiedDate']).toBeInstanceOf(Date);
    expect(data['modifiedDate']).not.toBe(date);
  });

  it('addCreatedBy', () => {

    const data: { [field: string]: any } = {
      test: 123,
    };

    const user = {
      name: 'test',
      type: 'admin'
    };

    addCreatedBy(data, user, true);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['createdBy']).toBeTruthy();
    expect(data['createdBy']).toBe(user);
  });

  it('convertTimestampToDate', () => {

    const modifiedDate = new Date(1982, 1, 2, 12, 32, 12, 32);
    const createdDate = new Date(1981, 1, 2, 12, 32, 12, 32);

    const data: { [field: string]: any } = {
      test: 123,
      modifiedDate: FirebaseTimestamp.fromDate(modifiedDate),
      createdDate: FirebaseTimestamp.fromDate(createdDate),
    };

    convertTimestampToDate(data);

    expect(data).toBeTruthy();
    expect(data['test']).toEqual(123);
    expect(data['modifiedDate']).toBeTruthy();
    expect(data['modifiedDate']).toEqual(modifiedDate);
    expect(data['createdDate']).toBeTruthy();
    expect(data['createdDate']).toEqual(createdDate);
  });

});
