# Read / Listen

#### For a working demo checkout: [Demo](https://fir-extended-demo.web.app/demo/), or [Code](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)

#### Method Documentation

- [listenForCollection$](../../classes/AngularFirestoreDeep.html#listenForCollection$)
- [listenForDocDeep$](../../classes/AngularFirestoreDeep.html#listenForDocDeep$)
- [listenForCollectionRecursively$](../../classes/AngularFirestoreDeep.html#listenForCollectionRecursively$)

All reads done by AngularFirestore-Deep is using snapshotChanges().

This is done for the following reasons:
<ul>
    <li>
      Allows the user to listen for changes to the document / collection being read / listened to, making sure the data is always up to date.
    </li>
    <li>
      Gives access to additional data that can be added to the data being read, such as:
        <ul>
          <li>
            id: string => the id of the document
          </li>
          <li>
            docRef: DocumentReference => the Firestore document reference
          </li>
          <li>
            path: string => A string representing the path of the referenced document (relative to the root of the database).
          </li>
          <li>
            docFs: AngularFirestoreDocument => the AngularFire Document reference, used be AngularFire
          </li>
          <li>    
            isExists: boolean => False if document does not exist, applicable when DocNotExistAction.RETURN_ALL_BUT_DATA is used.
          </li>
        </ul>
      These properties are added when a document is read but will not be saved to firestore.      
      <br>
      This is why extending FirestoreItem or FirestoreBaseItem is recommended with your firestore models. (see below for links)
    </li> 
</ul>

[FirestoreItem](../../interfaces/FirestoreItem.html)
<br>
[FirestoreBaseItem](../../interfaces/FirestoreBaseItem.html)

##### Listen for Document with sub collections.

```typescript
listenForRestaurantById$(restaurantId
:
string
):
Observable < FireItem < RestaurantItem >> {
  const docRef
:
DocumentReference < RestaurantItem > = getDocRefWithId(this.restaurantCollectionRef, restaurantId);
return this.firestoreExt.listenForDoc$<RestaurantItem>(docRef, restaurantSubCollectionQueries);
}
```

##### If you do not with to listen for changes and instead just get the firestore data once, you can use take(1):

```typescript
getRestaurantById$(restaurantId
:
string
):
Observable < FireItem < RestaurantItem >> {
  const docRef
:
DocumentReference < RestaurantItem > = getDocRefWithId(this.restaurantCollectionRef, restaurantId);
return this.firestoreExt.listenForDoc$<RestaurantItem>(docRef, restaurantSubCollectionQueries).pipe(
  take(1) // this makes sure that the observable stops after returning
);
}
```

##### Listen for Collection without listening for sub collections, notice the Partial<RestaurantItem>:

```typescript
listenForRestaurants$()
:
Observable < FireItem < Partial < RestaurantItem >> [] > {
  return this.firestoreExt.listenForCollection$<RestaurantItem>(this.restaurantCollectionFs);
}
```

##### Sub Collection Queries used in the examples.

[SubCollectionQuery documentation](../../interfaces/SubCollectionQuery.html)

```typescript
const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // add reviews sub Collection to restaurant object
  {
    name: 'reviews',
    queryConstraints: [
      orderBy('score')
    ]
  },
  { // add dishes sub Collection to restaurant object
    name: 'dishes',
    subCollectionQueries: [
      {name: 'images'} // add images sub Collection to dish object
    ]
  },
];
```

##### Models used in the examples.

```typescript
export interface RestaurantItem {
  name: string;
  category: string;
  averageReviewScore: number;
  address: AddressItem;
  dishes?: DishItem[]; // optional so that we can get just the base object to display in a list
  reviews?: ReviewItem[]; // optional so that we can get just the base object to display in a list
}

export interface AddressItem {
  zipCode: string;
  city: string;
  line1: string;
}

export interface DishItem {
  name: string;
  images: ImageItem[];
}

export interface ImageItem {
  url: string;
}

export interface ReviewItem {
  score: number;
  text: string;
  userName: string;
}
```


