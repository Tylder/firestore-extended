import firebase from 'firebase/app';
import 'firebase/firestore';
import {default as TEST_PROJECT} from './config';
import {createId} from './utils';
import {
  addCreatedBy,
  addCreatedDate,
  addDataToItem,
  addModifiedDate,
  convertTimestampToDate,
  getRefFromPath
} from '../helpers';
import DocumentReference = firebase.firestore.DocumentReference;
import CollectionReference = firebase.firestore.CollectionReference;

describe('Helpers', () => {

  let app: firebase.app.App;

  beforeEach(() => {
    app = firebase.initializeApp(TEST_PROJECT, createId());

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  });

  it('getRefFromPath document', () => {
    const path = "test/123"

    const ref = getRefFromPath(path, app);

    expect(ref).toBeTruthy()
    expect(ref).toBeInstanceOf(DocumentReference)
  });

  it('getRefFromPath collection', () => {
    const path = "test"

    const ref = getRefFromPath(path, app);

    expect(ref).toBeTruthy()
    expect(ref).toBeInstanceOf(CollectionReference)
  });

  it('addDataToItem inplace', () => {
    let data: { [field: string]: any } = {test: 123}

    addDataToItem(data, {
      thing: 'foo'
    }, true);

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.thing).toBeTruthy()
    expect(data.thing).toEqual('foo')
  });


  it('addDataToItem inplace false', () => {
    let data: { [field: string]: any } = {test: 123}

    data = addDataToItem(data, {
      thing: 'foo'
    }, false);

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.thing).toBeTruthy()
    expect(data.thing).toEqual('foo')
  });

  it('addCreatedDate no date given', () => {
    let data: { [field: string]: any } = {test: 123}

    addCreatedDate(data, true)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.createdDate).toBeTruthy()
    expect(data.createdDate).toBeInstanceOf(Date)
  });

  it('addCreatedDate date given', () => {
    let data: { [field: string]: any } = {test: 123}

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);

    addCreatedDate(data, true, date)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.createdDate).toBeTruthy()
    expect(data.createdDate).toBeInstanceOf(Date)
    expect(data.createdDate).toBe(date)
  });

  it('addCreatedDate no date given, try to overwrite', () => {

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);
    let data: { [field: string]: any } = {
      test: 123,
      createdDate: date
    }

    addCreatedDate(data, true)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.createdDate).toBeTruthy()
    expect(data.createdDate).toBeInstanceOf(Date)
    expect(data.createdDate).toBe(date)
  });

  it('addModifiedDate no date given', () => {
    let data: { [field: string]: any } = {test: 123}

    addModifiedDate(data, true)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.modifiedDate).toBeTruthy()
    expect(data.modifiedDate).toBeInstanceOf(Date)
  });

  it('addModifiedDate date given', () => {
    let data: { [field: string]: any } = {test: 123}

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);

    addModifiedDate(data, true, date)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.modifiedDate).toBeTruthy()
    expect(data.modifiedDate).toBeInstanceOf(Date)
    expect(data.modifiedDate).toBe(date)
  });

  it('addModifiedDate no date given, overwrite', () => {

    const date = new Date(1982, 1, 2, 12, 32, 12, 32);
    let data: { [field: string]: any } = {
      test: 123,
      modifiedDate: date
    }

    addModifiedDate(data, true)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.modifiedDate).toBeTruthy()
    expect(data.modifiedDate).toBeInstanceOf(Date)
    expect(data.modifiedDate).not.toBe(date)
  });

  it('addCreatedBy', () => {

    let data: { [field: string]: any } = {
      test: 123,
    }

    let user = {
      name: 'test',
      type: 'admin'
    }

    addCreatedBy(data, user, true)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.createdBy).toBeTruthy()
    expect(data.createdBy).toBe(user)
  });

  it('convertTimestampToDate', () => {

    const modifiedDate = new Date(1982, 1, 2, 12, 32, 12, 32);
    const createdDate = new Date(1981, 1, 2, 12, 32, 12, 32);

    let data: { [field: string]: any } = {
      test: 123,
      modifiedDate: firebase.firestore.Timestamp.fromDate(modifiedDate),
      createdDate: firebase.firestore.Timestamp.fromDate(createdDate),
    }

    convertTimestampToDate(data)

    expect(data).toBeTruthy()
    expect(data.test).toEqual(123)
    expect(data.modifiedDate).toBeTruthy()
    expect(data.modifiedDate).toEqual(modifiedDate)
    expect(data.createdDate).toBeTruthy()
    expect(data.createdDate).toEqual(createdDate)
  });

});
