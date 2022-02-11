export interface RestaurantItem {

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

export interface DishItem {
  name: string;
  images: ImageItem[];
  index: number;
}

export interface ImageItem {
  url: string;
}

export interface ReviewItem {
  score: number;
  text: string;
  userName: string;
}
