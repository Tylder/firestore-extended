# Update

#### For a working demo checkout: [Demo](../../../demo_), or [Code](https://github.com/Tylder/angularfirestore-deep)

#### Method Documentation

- [updateDeep$](../../classes/AngularFirestoreDeep.html#updateDeep$)
- [updateDeepByPath$](../../classes/AngularFirestoreDeep.html#updateDeepByPath$)
- [updateMultiple$](../../classes/AngularFirestoreDeep.html#updateMultiple$)
- [updateMultipleByPaths$](../../classes/AngularFirestoreDeep.html#updateMultipleByPaths$)

Works basically the same as [adding documents](write.html) in that the data can be split up into child collections and documents if
specified in the SubCollectionWriters.

##### Update Document

```typescript
editRestaurant$(restaurant: RestaurantItem, data: object): Observable<any> {
    return this.ngFirestoreDeep.updateDeep$(data, restaurant.docFs, restaurantSubCollectionWriters);
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
