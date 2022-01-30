import {FireItemWithDates, FireItemWithIndex, FireStoreItem} from '../../models/fireItem';

export interface RestaurantItem extends FireStoreItem, FireItemWithDates {
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

export interface AddressItem extends FireStoreItem, FireItemWithDates {
  zipCode: string;
  city: string;
  line1: string;
}

export interface DishItem extends FireStoreItem, FireItemWithDates, FireItemWithIndex {
  name: string;
  images: ImageItem[];
}

export interface ImageItem extends FireStoreItem, FireItemWithDates {
  url: string;
}

export interface ReviewItem extends FireStoreItem, FireItemWithDates {
  score: number;
  text: string;
  userName: string;
}
