/**
 * Mock Items used for testing
 */
import {RestaurantItem} from '../models/restaurant';
import {DragAndDropContainer, DragAndDropItem} from '../models/groupItem';

export const mockSimpleItems = [
  {
    foo: 'bar',
    thing: 123
  },
  {
    bar: 'foo',
    stuff: 321
  }
];


export const mockDeepItems: RestaurantItem[] = [
  {
    name: 'Tonys Pizzeria and Italian Food',
    category: 'italian',
    averageReviewScore: 6.5,
    address: {
      zipCode: '12345',
      city: 'example city',
      line1: '12 example rd',
    },
    dishes: [
      {
        name: 'Margherita Pizza',
        index: 2,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
      },
      {
        name: 'Pasta alla Carbonara',
        index: 1,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
      },
      {
        name: 'Other kind of Pizza',
        index: 0,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
      },
      {
        name: 'Other kind of Pasta',
        index: 3,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
      },
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
        name: 'Caesar salad',
        index: 0,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
      },
      {
        name: 'Chicken Salad',
        index: 1,
        images: [
          {url: 'example.jpg'},
          {url: 'example2.jpg'}
        ],
        ingredients: ['stuff']
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
  items: [
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
  ]
};
