# Delete

#### For a working demo checkout: [Demo](../../../demo), or [Code](https://github.com/Tylder/angularfirestore-deep)

#### Method Documentation

- [deleteDeep$](../../classes/AngularFirestoreDeep.html#deleteDeep$)
- [deleteDeepByItem$](../../classes/AngularFirestoreDeep.html#deleteDeepByItem$)
- [deleteDocByPath$](../../classes/AngularFirestoreDeep.html#deleteDocByPath$)
- [deleteMultiple$](../../classes/AngularFirestoreDeep.html#deleteMultiple$)
- [deleteMultipleByPaths$](../../classes/AngularFirestoreDeep.html#deleteMultipleByPaths$)
- [deleteMultipleDeep$](../../classes/AngularFirestoreDeep.html#deleteMultipleDeep$)

Firestore does not provide a way to delete a document which then deletes any other child documents in child colletions.
The only way to make sure all child documents are deleted is to delete each individually.

If wish to benefit from using child collections and documents then this quickly becomes a very repetitive issue.

AngularFireStore-Deep handles that by using [SubCollectionQuery](../../classes/SubCollectionQuery.html)


#####  Delete Document 
and documents in sub collections as specified in restaurantSubCollectionQueries, see below for definition.

```typescript
deleteRestaurantById$(restaurantId: string): Observable<RestaurantItem> {
    const docFs = this.restaurantCollectionFs.doc(restaurantId);
    return this.ngFirestoreDeep.deleteDeep$(docFs, restaurantSubCollectionQueries);
}
```

#####  Delete all documents in collection 
and documents in sub collections as specified in restaurantSubCollectionQueries, see below for definition.

1. Listens to all restaurants in collection.
2. Since we only want to get the restaurants once and not continuously listen for updates we do a take(1)
3. Map the list of restaurants to a list of AngularFirestoreDocuments.
   This is why we add this data to the FirestoreItem when we listen for a document.
   It makes any future operations on a document so much faster and cheaper since we already have its path and reference saved.
4. switchMap to deleteMultipleDeep -> works the same as deleteMultipleDeep except we can give it a list of AngularFirestoreDocuments
   and it deletes them all asynchronously.


```typescript
deleteAllRestaurants$(): Observable<any> {
    return this.listenForRestaurants$().pipe(
        take(1),
        map((restaurants: RestaurantItem[]) => restaurants.map(rest => rest.docFs)),
        tap(val => console.log(val)),
        switchMap((docsFs: AngularFirestoreDocument[]) => this.ngFirestoreDeep.deleteMultipleDeep$(docsFs, restaurantSubCollectionQueries)),
    );
}   
```


#####  Sub Collection Queries used in the examples.

[SubCollectionQuery documentation](../../interfaces/SubCollectionQuery.html)

```typescript
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
