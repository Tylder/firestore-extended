import {ItemWithIndex} from '../../models/fireItem';

export interface RestaurantItem {
  name: string;
  category: string;
  averageReviewScore: number;
  address: AddressItem;
  dishes: DishItem[]; // optional so that we can get just the base object to display in a list
  reviews: ReviewItem[]; // optional so that we can get just the base object to display in a list
}

// export type RestaurantItemIn = Omit<RestaurantItem, 'dishes | reviews'> & FirestoreItemMetadataOptional<RestaurantItem> & {
//   dishes: FirestoreItemMetadataOptional<DishItem>[]; // optional so that we can get just the base object to display in a list
//   reviews: FirestoreItemMetadataOptional<ReviewItem>[]; // optional so that we can get just the base object to display in a list
// };

export interface AddressItem {
  zipCode: string;
  city: string;
  line1: string;
}

export interface DishItem extends ItemWithIndex {
  name: string;
  images: ImageItem[];
  ingredients: string[];
}

export interface ImageItem {
  url: string;
}

export interface ReviewItem {
  score: number;
  text: string;
  userName: string;
}
