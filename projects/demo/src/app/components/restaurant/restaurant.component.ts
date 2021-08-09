import {Component, Input, OnInit} from '@angular/core';
import {RestaurantItem, ReviewItem} from '../../models/restaurant';
import {RestaurantFsService} from '../../services/restaurant-fs.service';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent implements OnInit {

  @Input() restaurant: RestaurantItem | undefined;

  constructor(private restaurantFsService: RestaurantFsService) {}

  ngOnInit(): void {
    if (!this.restaurant) {
      throw new TypeError("'Restaurant' is required");
    }
  }

  addRandomReview(): void {

    const review: ReviewItem = {
      score: Math.floor(Math.random() * 10) + 1, // random integer 1 - 10;
      text: 'random review',
      userName: 'anon'
    };

    // this.restaurantFsService.addReview$(this.restaurant, review).subscribe();
  }





}
