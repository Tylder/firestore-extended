# Edit Document Id

#### For a working demo checkout: [Demo](https://fir-extended-demo.web.app/demo/), or [Code](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)

#### Method Documentation

- [changeDocId$](../../classes/FirestoreExt.html#changeDocId$)

Firestore does not provide a method for changing the Id of a document. The only way is to copy the document and all its child documents and
then create a new document with all the child documents. Once this is done the old document is deleted.

##### Edit name of document.

If there are child documents you should provide subCollectionQueries and subCollectionWriters.

```ts
changeIdOfRestaurant$(restaurant: FireItem<RestaurantItem>, newId: string): Observable<FireItem<RestaurantItem>> {
  return this.firestoreExt.changeDocId$(
    restaurant.firestoreMetadata.ref,
    newId,
    restaurantSubCollectionQueries,
    restaurantSubCollectionWriters
  );
}
```

##### Sub Collection Queries and Writers used in the examples.

[SubCollectionQuery documentation](../../interfaces/SubCollectionQuery.html)
<br>
[SubCollectionWriter documentation](../../interfaces/SubCollectionWriter.html)

```typescript
const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  { name: 'reviews' }, // make reviews a sub collection
  {
    name: 'dishes',  // make dishes a sub collection
    subCollectionWriters: [ // sub collection inside a sub collection
      {name: 'images'} // make images a sub collection inside dishes
    ]
  },
];

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

export interface DishItem extends FirestoreItem {
  name: string;
  images: ImageItem[];
}

export interface ImageItem extends FirestoreItem {
  url: string;
}

export interface ReviewItem extends FirestoreItem  {
  score: number;
  text: string;
  userName: string;
}
```
