# AngularFirestore-Deep

Simplify the work with complex and deep objects while retaining all the great benefits from Firebase Firestore.

```bash
ng add @angular/fire
npm install --save angularfirestore-deep
```

Firestore splits its data up into collections and documents which is what allows it to be scalable and fast.

The issues that this can cause is that the best way to store your data might not be the best way to work with and display that data.

It can also be more difficult to figure out how to store your data in a way that is not only cheap in terms of reads but also cheap in terms of performance/speed.

AngularFireStore-Deep is meant to help developers solve these issues.

### Documentation and Examples
[Documentation](https://angularfirestore-deep.web.app/docs/)
<br>
[Github](https://github.com/Tylder/angularfirestore-deep/tree/master/projects/angularfirestore-deep) 


> [Introduction](https://angularfirestore-deep.web.app/docs/additional-documentation/introduction.html)
> 
>
> #### Actions 
> [Read](https://angularfirestore-deep.web.app/docs/additional-documentation/actions/read.html)
> <br>
> [Write](https://angularfirestore-deep.web.app/docs/additional-documentation/actions/write.html)
> <br>
> [Update](https://angularfirestore-deep.web.app/docs/additional-documentation/actions/update.html)
> <br>
> [Delete](https://angularfirestore-deep.web.app/docs/additional-documentation/actions/delete.html)
> <br>
> [Edit Id](https://angularfirestore-deep.web.app/docs/additional-documentation/actions/edit-id.html)


### Demo
You can find a simple demo in projects/demo.

It can be run locally if you provide your own firebaseConfig in the environment file or you can find a running demo here: 
<br>
[Demo](https://angularfirestore-deep.web.app/demo/)

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

Use the library in any Angular application:

```ts
  ngFirestoreDeep: AngularFirestoreDeep;  //  AngularFirestoreDeep variable

  constructor(private ngFireStore: AngularFirestore) {
    this.ngFirestoreDeep = new AngularFirestoreDeep(ngFireStore);  //  initialize AngularFireStoreDeep with AngularFirestore
  }
```

See the [Documentation](https://angularfirestore-deep.web.app/docs/) for much more information. 

## License

MIT © [Daniel Lofgren](mailto:lofgrendaniel@hotmail.com)
