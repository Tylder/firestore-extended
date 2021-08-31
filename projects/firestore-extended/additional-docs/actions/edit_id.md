# Edit Document Id

#### For a working demo checkout: [Demo](../../../demo), or [Code](https://github.com/Tylder/angularfirestore-deep)

#### Method Documentation

- [changeDocId$](../../classes/AngularFirestoreDeep.html#changeDocId$)

Firestore does not provide a method for changing the Id of a document.
The only way is to copy the document and all its child documents and then create a new document with all the child documents.
Once this is done the old document is deleted.

##### Edit name of document.
If there are child documents your should provide subCollectionQueries and subCollectionWriters.

```typescript
changeIdOfRestaurant$(restaurant: RestaurantItem, newId: string): Observable<RestaurantItem> {

    return this.ngFirestoreDeep.changeDocId$(restaurant.docFs,
                                             newId,
                                             restaurantSubCollectionQueries,
                                             restaurantSubCollectionWriters);
}
```

#####  Sub Collection Queries and Writers used in the examples.

[SubCollectionQuery documentation](../../interfaces/SubCollectionQuery.html)
<br>
[SubCollectionWriter documentation](../../interfaces/SubCollectionWriter.html)

```typescript
const restaurantSubCollectionWriters: SubCollectionWriter[] = [
  { name: 'reviews' }, // make reviews a sub collection
  {
    name: 'dishes',  // make dishes a sub collection
    subCollectionWriters: [ // sub collection inside a sub collection
      { name: 'images' } // make images a sub collection inside dishes
    ]
  },
];

const restaurantSubCollectionQueries: SubCollectionQuery[] = [
  // add reviews sub Collection to restaurant object
  {
    name: 'reviews',
    queryFn: ref => ref.orderBy('score')
  },
  { // add dishes sub Collection to restaurant object
    name: 'dishes',
    subCollectionQueries: [
      { name: 'images' } // add images sub Collection to dish object
    ]
  },
];
```

##### Models used in the examples.
Notice that they extend [FirestoreItem](../../interfaces/FirestoreItem.html)

```typescript
export interface RestaurantItem extends FirestoreItem {
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
