# Write / Add

#### For a working demo checkout: [Demo](https://fir-extended-demo.web.app/demo/), or [Code](https://github.com/Tylder/firestore-extended/tree/master/projects/firestore-extended)

#### Method Documentation

- [addDeep$](../../classes/AngularFirestoreDeep.html#addDeep$)

Allows for easy splitting up of data into child collections and documents.

All you need to do is specify the child collections that should be created
in [SubCollectionWriters](../../interfaces/SubCollectionWriter.html)

Example restaurant object to add to firestore (same as can be seen in the [Demo](https://fir-extended-demo.web.app/demo/)):

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

If we wish to split this restaurant object up by putting reviews and dishes in their own collection and also keep the images in the dishes
in their collection under dishes all we have to do is specify that in a list of SubCollectionWriters

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
```

Once that is done its easy to write all this to firestore, notice that the optional docId is given as the restaurant name.:
if no docId is given a random unique one is used.

```typescript
addRestaurant$(restaurant
:
RestaurantItem
):
Observable < FireItem < RestaurantItem >> {
  return this.firestoreExt.add$<RestaurantItem>(restaurant, this.restaurantCollectionRef, restaurantSubCollectionWriters, true, restaurant.name);
}
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
