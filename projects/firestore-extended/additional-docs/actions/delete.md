# Delete

#### For a working demo checkout: [Demo](https://fir-extended-demo.web.app/demo/), or [Code](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)

#### Method Documentation

- [delete$](../../classes/FirestoreExt.html#delete$)
- [deleteItem$](../../classes/FirestoreExt.html#deleteItem$)
- [deleteCollection$](../../classes/FirestoreExt.html#deleteCollection$)
- [deleteMultiple$](../../classes/FirestoreExt.html#deleteMultiple$)
- [deleteMultipleByPaths$](../../classes/FirestoreExt.html#deleteMultipleByPaths$)
- [deleteMultipleSimple$](../../classes/FirestoreExt.html#deleteMultipleSimple$)
- [deleteDocByPath$](../../classes/FirestoreExt.html#deleteDocByPath$)
- [deleteIndexedItemInArray$](../../classes/FirestoreExt.html#deleteIndexedItemInArray$)
- [deleteIndexedItemsInArray$](../../classes/FirestoreExt.html#deleteIndexedItemsInArray$)

Firestore does not provide a way to delete a document which then deletes any other child documents in child collections. The only way to
make sure all child documents are deleted is to delete each individually.

If wish to benefit from using child collections and documents then this quickly becomes a very repetitive issue.

Firestore-Extended handles that by using [SubCollectionQuery](../../classes/SubCollectionQuery.html)

##### Delete Document

and documents in sub collections as specified in restaurantSubCollectionQueries, see below for definition.

```ts
deleteRestaurantById$(restaurantId
:
string
):
Observable < void > {
  const docRef
:
DocumentReference < RestaurantItem > = getDocRefWithId(this.restaurantCollectionRef, restaurantId);
return this.firestoreExt.delete$(docRef, restaurantSubCollectionQueries);
}
```

##### Delete all documents in collection

Delete all documents and documents in sub collections as specified in restaurantSubCollectionQueries, see below for definition. This is
quite inefficient since we must fetch all documents and the documents in any subcollection. This is ok if the collection is quite small but
for larger collections I recommend deleting the collection through the Firebase console.

This is what happens behind the scenes:

1. Listens to all restaurants in collection.
2. Since we only want to get the restaurants once and not continuously listen for updates we do a take(1) on the observable.
3. Map the list of restaurants to a list of Firestore DocumentReferences. This is why we add this data to the `FirestoreMetadata` when we
   listen for a document. It makes any future operations on a document so much faster and cheaper since we already have its path and
   reference saved.
4. switchMap to deleteMultiple$ -> and it deletes them all given documents asynchronously.

```ts
deleteAllRestaurants$()
:
Observable < any > {
  return this.firestoreExt.deleteCollection$(this.restaurantCollectionRef, restaurantSubCollectionQueries);
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
