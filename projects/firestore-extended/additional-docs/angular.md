# Angular Modules and Services

Firestore-extended is made to work with any typescript project but this folder contains some specific Angular Modules and Services to make
life easier for those that are using Angular.

Specically they initializes the Firebase App and make it easy to ensure that only a single Firebase App is created.

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

Then inject NgxFirestoreExtService in to any service to use Firestore-extended. NgxFirestoreExtService is just a super simple convenience
class that cleans up your code by already including this.firestore, this.firestoreExt and this.firebaseAp as members.

NgxFirebaseService uses the Firebase App created by NgxFirebaseModule.

`example.fs.service.ts`

```typescript

@Injectable({
  providedIn: 'root'
})
export class ExampleFirstoreService extends NgxFirestoreExtService {

  public exampleCollectionRef: CollectionReference<Example>;

  constructor(ngxFirebaseService: NgxFirebaseService) { /* inject NgxFirebaseService here */
    super(ngxFirebaseService); /* call super */

    this.exampleCollectionRef = collection(this.firestore, 'example');
  }

  listenAll$(): Observable<FireItem<Example>[]> {
    return this.firestoreExt.listenForCollection$<Example>(this.exampleCollectionRef);
  }
}
```


