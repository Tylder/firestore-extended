/**
 * The ability to place docs and collection n deep but also flatten the it in order to reduce reads.
 * It becomes a balance between speed and economy. Since multiple docs can be read simultaneously but will cost more.
 * These classes aim to make it easy to control that.
 *
 * Allows you to have a complex deep object and write it to firestore by splitting it up in to collections and documents.
 *
 * Example services object that we wish to save to firestore.
 *
 *    const services = {
 *       name: 'example services',
 *       address: {
 *          zipcode: 12345,
 *          city: 'example city',
 *          line1: '12 example rd'
 *       },
 *       dishes: [
 *         {
 *           name: 'dish1',
 *           images: [
 *             {url: example.jpg},
 *             {url: example2.jpg}
 *           ]
 *         },
 *         {
 *           name: 'dish2',
 *           images: [
 *             {url: example.jpg},
 *             {url: example2.jpg}
 *           ]
 *         }
 *       ]
 *       reviews: [
 *         {
 *            score: 5
 *            text: 'decent food'
 *         },
 *         {
 *            score: 8
 *            text: 'good food'
 *         },
 *       ]
 *    }
 *
 *  You would be able to save this data 'as is' to a single firestore document using arrays and maps.
 *  The problem comes when you later on wish to add/delete or alter an image of dish.
 *
 *  Another issue is that you might have thousands of reviews and since they are all saved in the same document.
 *  If for example you wish to show a list of all restaurants and all you want to show is the name before a user clicks
 *  the services you would still have to download the entire services object containing all those thousands of reviews.
 *  This would be ok in terms of cost of reads but very expensive in terms of performance.
 *  Each services object would be huge, killing the user's data plan and slowing down your site.
 *
 *  It would be much better to make reviews a collection inside services. That way you could show the services name
 *  without downloading all the reviews.
 *  If you wish to show an average review score the most efficient way would be to to calculate that
 *  each time you update the review collection and adding the average to the services document.
 *
 *  What this wrapper intends to do is to simplify saving some data in sub collections without changing the way you
 *  work with the data.
 *  So you could have a services object that contains all the data and when you add it to firestore the data is automatically
 *  placed in your sub collections without you having to worry about it after you initially set it up.
 *
 *  Another huge advantage to separating your data in to sub collections is that it allows you to choose between
 *  performance and cost.
 *  Saving the data to one large document would save your firestore read/writes and could potentially make a big difference
 *  in terms of cost depending on your application.
 *  But it would also slow it down as explained above.
 *  Splitting your data up in to sub collections allows you to asynchronously read/write those collections at the same time.
 *
 *  So if you compare one large document and a small document with 4 subcollections of about equal size.
 *  It would require 5 firestore reads instead of 1 if each sub collection contains 1 document.
 *  But the speed could also potentially be 5X faster since all those parts are read at the same time.
 *
 *  Using SubCollectionWriters and SubCollectionQueries allows you to create the perfect compromise between
 *  ease of working with the firestore database, cost and performance.
 *
 *  - address (collection)
 *  - reviews (collection)
 *  - dishes (collection)
 *    - images (collection)
 *
 *    @example
 *    const subCollectionWriters: SubCollectionWriter[] = [
 *      { name: 'data' },
 *      {
 *        name: 'images',
 *        docId: 'data',  // images is an array but since a docId is given it be saved in a single doc
 *      },
 *      {
 *        name: 'variants',
 *        subCollectionWriters: [  // sub collection inside a sub collection
 *          { name: 'otherData'}
 *        ]
 *      }
 *    ];
 */
export interface SubCollectionWriter {
  /** the name of the subCollection to be created. If a key in the data to be written is the same as this name it will be
   * saved separately in a sub collection.
   */
  name: string;

  /** if the data to be written is an array and a docId is given the array is saved as single document under that docId.
   *  The array will be turned in to a map with the index number as the key.
   *                    if no docId is given the array will be saved as individual documents with random ids.
   *                    if no docId is given and the data is an object a single document will be created using a default name
   *                    i.e this.defaultDocId
   */
  docId?: string;

  /** each collection can contain other sub collections, unless a docId is given in which case subCollectionWriters
   * cannot be used and an error will be thrown */
  subCollections?: SubCollectionWriter[]; // sub/sub collections

  // /** if true then the next level subCollectionWriters will be placed at the same level as this with a reference back
  //  * to the linked data, good for secure subcols
  //  */
  // isFlat?: boolean;
}

