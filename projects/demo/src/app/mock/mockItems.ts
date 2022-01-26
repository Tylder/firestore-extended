/**
 * Mock Items used for testing
 */
import {RestaurantItem} from '../models/restaurant';
import {DragAndDropContainer, DragAndDropItem} from '../models/groupItem';


/**
 * Mock Items used for demo
 *
 * The demo still uses firestore to store the data however.
 */

export const mockRestaurantItems: RestaurantItem[] = [
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
        index: 0,
        name: 'Margherita Pizza',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      },
      {
        index: 1,
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

  {
    name: 'Salads And Stuff',
    category: 'salads',
    averageReviewScore: 7.0,
    address: {
      zipCode: '45431',
      city: 'example city',
      line1: '13 example rd'
    },
    dishes: [
      {
        index: 0,
        name: 'Caesar salad',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      },
      {
        index: 1,
        name: 'Chicken Salad',
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ]
      }
    ],
    reviews: [
      {
        score: 5,
        text: 'Ok',
        userName: 'anon123'
      },
      {
        score: 9,
        text: 'great',
        userName: 'foodlover33'
      },
    ]
  },
];

export const mockDragAndDropItems: DragAndDropItem[] = [
  {
    index: 0,
    groupName: 'A',
    data: '123'
  },
  {
    index: 1,
    groupName: 'A',
    data: '311'
  },
  {
    index: 2,
    groupName: 'A',
    data: 'Abc'
  },
  {
    index: 0,
    groupName: 'B',
    data: 'sdsd'
  },
  {
    index: 1,
    groupName: 'B',
    data: '23s'
  }
];


export const mockDragAndDropContainer: DragAndDropContainer = {
  items: mockDragAndDropItems
};
