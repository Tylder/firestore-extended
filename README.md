# Firestore Extended (web and node.js)

Simplify the work with complex and deep objects while retaining all the great benefits from Firebase Firestore.

```bash
npm install firebase rxjs firestore-extended --save
```

Firestore splits its data up into collections and documents which is what allows it to be scalable and fast.

The issues that this can cause is that the best way to store your data might not be the best way to work with and display that data.

It can also be more difficult to figure out how to store your data in a way that is not only cheap in terms of reads but also cheap in terms
of performance/speed.

Firestore Extended is meant to help developers solve these issues.

### Documentation and Examples

[Documentation](https://fir-extended-demo.web.app/docs/)
<br>
[Github](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)


> [Introduction](https://fir-extended-demo.web.app/docs/additional-documentation/introduction.html)
>
>
> #### Actions
> [Read](https://fir-extended-demo.web.app/docs/additional-documentation/actions/read.html)
> <br>
> [Write](https://fir-extended-demo.web.app/docs/additional-documentation/actions/write.html)
> <br>
> [Update](https://fir-extended-demo.web.app/docs/additional-documentation/actions/update.html)
> <br>
> [Delete](https://fir-extended-demo.web.app/docs/additional-documentation/actions/delete.html)
> <br>
> [Edit Id](https://fir-extended-demo.web.app/docs/additional-documentation/actions/edit-id.html)

### Demo

You can find a simple demo in projects/demo.

It can be run locally if you provide your own firebaseConfig in the environment file or you can find a running demo here:
<br>
[Demo](https://fir-extended-demo.web.app/demo/)

> Steps to run locally:
> <ol>
>    <li>Clone this repo</li>
>    <li>Setup a firebase project and place the config 'firebaseConfig' here: projects/demo/src/environments/firebase-secure.ts and export it.</li>
>    <li>Run the following commands:</li>
> </ol>
>

```bash
npm install
npm run start
```

## Using the library

This will add and read the `Address` in a collection inside each `Restaurant` Document.

``example.fs.service.ts``

```ts

export interface Address {
  zipCode: string;
  city: string;
  line1: string;
}

export interface Restaurant {
  address: Address
}

const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  // add address sub Collection inside each Example Document
  {name: 'address'},
];

const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // listen for address sub Collection inside each Example Document
  {name: 'address'},
];

export class RestaurantFsService { // <-- Service for listening/writing to Firestore

  app: firebase.app.App;
  rxFireExt: RxFirestoreExtended;  //  RxfirestoreExtended
  collectionRef: CollectionReference<Restaurant>;

  constructor() {
    this.app = firebase.initializeApp(environment.firebase); // only call this once per application
    this.app.firestore().useEmulator('localhost', firestoreEmulatorPort);
    this.rxFireExt = new RxFirestoreExtended(this.app);  //  initialize RxFireStoreExtended with firestore
    this.collectionRef = this.app.firestore().collection('restaurants'); // AngularFirestoreCollectionRef to the example collection
  }

  listenForExamples$(): Observable<Restaurant[]> {
    return this.rxFireExt.listenForCollection$<RestaurantItem>(this.restaurantCollectionRef, restaurantSubCollectionQueries);
  }
}

```

### Angular

Please read [Angular README](https://fir-extended-demo.web.app/docs/angular.md) for more information regarding use with Angular.

See the [Documentation](https://fir-extended-demo.web.app/docs/) for much more information.

## License

MIT © [Daniel Lofgren](mailto:lofgrendaniel@hotmail.com)
