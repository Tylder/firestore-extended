# Write / Add

#### For a working demo checkout: [Demo](../../../demo), or [Code](https://github.com/Tylder/angularfirestore-deep)

#### Method Documentation

- [addDeep$](../../classes/AngularFirestoreDeep.html#addDeep$)

Allows for easy splitting up of data into child collections and documents.

All you need to do is specify the child collections that should be created in [SubCollectionWriters](../../interfaces/SubCollectionWriter.html)

Example restaurant object to add to firestore (same as can be seen in [demo](https://angularfirestore-deep.web.app/demo/)):
```typescript
{
    name: 'Tonys Pizzeria and Italian Food',
    category: 'italian',
    averageReviewScore: 6.5,
    address: {
        zipCode: '12345',
        city: 'example city',
        line1: '12 example rd'
    },
    dishes: [
        {
            name: 'Margherita Pizza',
            images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
            ]
        },
        {
            name: 'Pasta alla Carbonara',
            images: [
                {url: 'example.jpg'},
                {url: 'example2.jpg'}
            ]
        }
    ],
    reviews: [
        {
            score: 5,
            text: 'decent food',
            userName: 'anon123'
        },
        {
            score: 8,
            text: 'good food',
            userName: 'foodlover33'
        },
    ]
},
```

If we wish to split this restaurant object up by putting reviews and dishes in their own collection and also keep the images 
in the dishes in their collection under dishes all we have to do is specify that in a list of SubCollectionWriters

#####  Sub Collection Writers used in the examples.

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
```

Once that is done its easy to write all this to firestore: 
```typescript
addRestaurant$(restaurant: RestaurantItem): Observable<RestaurantItem> {
    return this.ngFirestoreDeep
        .addDeep$<RestaurantItem>(restaurant, this.restaurantCollectionFs, restaurantSubCollectionWriters, true, restaurant.name);
}
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
