# Introduction Example

We run an app or site that catalogues restaurants, user reviews, the dishes they offer and pictures of each dish.

Each restaurant would also have some basic data such as their name, address, food category and average review score.

An example restaurant object might look like this:

```ts
{
    name: 'Tonys Pizzeria and Italian Food',
    category: 'italian',
    averageReviewScore: 6.5,
    address: {
        zipcode: 12345,
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
}
```

Note that there are several dishes and reviews and that the dishes each have an array of urls to images.
Saving this data to a single Firestore document is possible but since the reviews for some restaurant might be in the thousands it is not practical to do so.

If for example you wish to show a list of all restaurants and all you want to show is the name before a user clicks
the restaurant you would still have to download the entire restaurant object containing all those thousands of reviews.

This would be ok in terms of cost of reads but very expensive in terms of performance.
Each restaurant object would be huge, killing the user's data plan and slowing down your site.

Now we have a few options regarding the reviews, each with benefits and issues:  

1. We could store them in a separate collection under the Restaurant, each review would be its own document.
    - Benefits:
        + Nicely encapsulates the restaurant. Since all the data is stored under the same document.
        + We can get the base restaurant data for displaying in a list without getting unnecessary data.
    - Issues: 
        + When the user presses the restaurant we want to get all the data, that means writing code to get the reviews and the dishes and then putting them all together again to create
        the restaurant object as seen in the example. This gets even worse if you decide to place the images or other data in its own collection under each dish document.
        We end up doing a lot of collecting of all the data from different places and putting it back together for use in our app.
        The same is true if we start of with a restaurant object and with to save it to firestore, we then have to split it up and save each part separetly.       

2. We could store them together will all other reviews in a top level collection, each review would be its own document.
    - Benefits: 
        + Keeps all reviews together and makes it simpler to perform complicated queries on them. 
          For example maybe you with to display all reviews from a specific user. 
          However you could still do this with a sub collection using firestore.collectionGroup.
        + We can get the base restaurant data for displaying in a list without getting unnecessary data.
    - Issues: 
        + Would require a costly, but fast query for restaurant name in order to get the reviews related to a specific restaurant.
        + Same as above.
        
I think that in this case since its much more common to want the reviews per restaurant rather than per user, we should keep the reviews in a sub collection under the product.
This would make getting the restaurants reviews cheaper and faster.

Wouldn't it be nice to not have to worry about splitting the data up into sub collections and putting it back together again when you 
want the entire object.

<strong>That is where AngularFirestore-deep comes in.</strong>

The 'deep' comes from the ability to read/write/update/delete collections and documents arbitrarily deep (up to the firestore max of 100 levels) and not have to worry about splitting the data up and putting it back together.

We do that by using SubCollectionQueries and SubCollectionWriters, these are classes that allow us to specify how we want the data to be stored. 
AngularFirestore-deep then uses these to perform your read/write/update/delete and you do not have to deal with splitting up the data and collecting it back together.

---

#### Example SubCollectionQuery array
This SubCollectionQuery specifies that the reviews are saved in a collection inside the restaurant document and they should be read and ordered by score.
The dishes are also stored as a sub collection and inside each dish document there is another sub collection called images. 

[SubCollectionQuery documentation]()

```typescript
const restaurantSubColQuery: SubCollectionQuery[] = [
    { 
        name: 'reviews', 
        queryFn: ref => ref.orderBy('score')
    },
    {
        name: 'dishes',
        subCollectionQueries: [  // sub collection inside a sub collection
            { 
                name: 'images' 
            }
        ]
    },
];
```

---

#### Example SubCollectionWriter array
SubCollectionWriters are very similar to SubCollectionQueries, the most obvious difference is the lack of the need for queryFunctions.

[SubCollectionWriter documentation]()

```typescript
const restaurantSubColWriters: SubCollectionWriter[] = [
    { 
        name: 'reviews' 
    },
    {
        name: 'dishes',
        subCollectionWriters: [  // sub collection inside a sub collection
            { 
                name: 'images' 
            }
        ]
    },
];
```

## Performance / Cost

Another huge advantage to separating your data in sub collections is that it allows you to choose between
performance and cost.
Saving the data to one large document would save your firestore read/writes and could potentially make a big difference
in terms of cost depending on your application.
But it would also slow it down as explained above.
Splitting your data up in to sub collections allows you to asynchronously read/write those collections at the same time.

So if you compare one large document and a small document with 4 sub collections of about equal size.
It would require 5 firestore reads instead of 1 if each sub collection contains 1 document.
But the speed could also potentially be 5X faster since all those collections/documents are read at the same time.
