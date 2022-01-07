# Angular Modules and Services

Firestore-extended is made to work with any typescript project but this folder
contains some specific Angular Modules and Services to make life easier for those 
that are using Angular.

Specically they initializes the Firebase App and make it easy to ensure that 
only a single Firebase App is created.


### Add to Angular

Add NgxFirebaseModule and call forRoot with the firebase config.

`app.module.ts`
```typescript
@NgModule({
  imports: [
    NgxFirebaseModule.forRoot(environment.firebase),
  ]
})
```

Then inject NgxFirestoreExtendedService in to any service to use Firestore-extended.

`example.fs.service.ts`
```typescript

@Injectable({
  providedIn: 'root'
})
export class ExampleFireStoreService {

  collectionRef: CollectionReference<Example>;
  firestore: firebase.firestore.Firestore;
  fireExt: RxFirestoreExtended;

  constructor(firestoreExtService: NgxFirestoreExtendedService) { // <-- only one firebase App will be created no matter how many services inject this 
    this.fireExt = firestoreExtService.fireExt; // <-- access to firestore-extended
    this.firestore = firestoreExtService.app.firestore(); 
    this.collectionRef = this.firestore.collection('example') as CollectionReference<Example>;
  }

  listenAll$(): Observable<Example[]> {
    return this.fireExt.listenForCollection$<Example>(collectionRef);
  }
}
```


