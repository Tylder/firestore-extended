import {FirestoreItem} from '../../../../rxfire-extended/src/lib/models/firestoreItem';

export interface RestaurantItem extends FirestoreItem{
  name: string;
  category: string;
  averageReviewScore: number;
  address: AddressItem;
  dishes: DishItem[]; // optional so that we can get just the base object to display in a list
  reviews: ReviewItem[]; // optional so that we can get just the base object to display in a list
}

export interface AddressItem {
  zipCode: string;
  city: string;
  line1: string;
}

export interface DishItem extends FirestoreItem {
  name: string;
  images: ImageItem[];
  index: number;
}

export interface ImageItem extends FirestoreItem {
  url: string;
}

export interface ReviewItem extends FirestoreItem {
  score: number;
  text: string;
  userName: string;
}
