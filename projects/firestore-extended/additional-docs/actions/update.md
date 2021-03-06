# Update

#### For a working demo checkout: [Demo](https://fir-extended-demo.web.app/demo/), or [Code](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)

#### Method Documentation

- [update$](../../classes/FirestoreExt.html#update$)
- [updateMultiple$](../../classes/FirestoreExt.html#updateMultiple$)
- [moveItemInArray$](../../classes/FirestoreExt.html#moveItemInArray$)
- [transferItemInIndexedDocs](../../classes/FirestoreExt.html#transferItemInIndexedDocs)

Works basically the same as [adding documents](write.html) in that the data can be split up into child collections and documents if
specified in the SubCollectionWriters.

##### Update Document

```ts
editRestaurant$(restaurant: FireItem<RestaurantItem>, data: UpdateData<Partial<RestaurantItem>>): Observable<void> {
    return this.firestoreExt.update$(data, restaurant.firestoreMetadata.ref, restaurantSubCollectionWriters);
}
```

##### Sub Collection Writers used in the examples.

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
