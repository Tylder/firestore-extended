import {Component} from '@angular/core';
import {RestaurantFsService} from './services/restaurant-fs.service';
import {RestaurantItem} from './models/restaurant';
import {mockRestaurantItems} from './mock/mockItems';
import {BehaviorSubject, of, ReplaySubject} from 'rxjs';
import {filter, map, switchMap, take, tap} from 'rxjs/operators';
import {FireItem} from 'firestore-extended';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  restaurants$: BehaviorSubject<FireItem<RestaurantItem>[]> = new BehaviorSubject<FireItem<RestaurantItem>[]>([]);

  // BehaviorSubject where the selected restaurant taken from firestore is kept, uses listenDeep to
  selectedRestaurantFull$: ReplaySubject<FireItem<RestaurantItem>> = new ReplaySubject<FireItem<RestaurantItem>>(undefined);

  // selected restaurant from firestore..does not contain reviews and dishes
  selectedRestaurant$: ReplaySubject<FireItem<RestaurantItem> | null> = new ReplaySubject<FireItem<RestaurantItem> | null>(undefined);

  mockRestaurants: RestaurantItem[] = mockRestaurantItems;  // list of mock restaurants
  selectedMockRestaurant: RestaurantItem | null = null;

  constructor(private restaurantFsService: RestaurantFsService) {


    /* listen for restaurants and keep them in this.restaurants$ */
    this.restaurantFsService.listenForRestaurants$().pipe(
      tap((restaurants) => {
        console.log(restaurants);
      }),
    ).subscribe((restaurants) => this.restaurants$.next(restaurants));

    /* listen for selectedRestaurant$ and update selectedRestaurantFull$ if changed */
    this.selectedRestaurant$.pipe(
      switchMap((restaurant) => {
        if (restaurant != null) {
          const id = restaurant?.firestoreMetadata?.id as string;
          return this.restaurantFsService.listenForRestaurantById$(id);
        } else {
          return of(null);
        }
      }),
    ).subscribe((restaurantFull) => {
      if (restaurantFull) {
        this.selectedRestaurantFull$.next(restaurantFull);
      }
    });

    /* set selectedRestaurant$ to null if not in firestore, meaning it has been deleted or had its id changed */
    this.restaurants$.pipe(
      map((restaurants) => restaurants.map(rest => rest.firestoreMetadata.id)),
      switchMap((restaurantIds: string[]) => {
        return this.selectedRestaurantFull$.pipe(
          take(1),
          filter(selectedRestaurant => selectedRestaurant != null),
          map((selectedRestaurant) => selectedRestaurant.firestoreMetadata.id),
          tap(selectedRestaurantId => {
            if (restaurantIds.findIndex(id => id === selectedRestaurantId) === -1) { // selected restaurant id not in restaurants
              this.selectedRestaurant$.next(null);
            }
          })
        );
      }),
    ).subscribe();
  }

  addRestaurant(restaurant: RestaurantItem): void {
    this.restaurantFsService.addRestaurant$(restaurant).subscribe();
  }

  deleteRestaurant(restaurant: FireItem<RestaurantItem>): void {
    this.restaurantFsService.deleteRestaurantById$(restaurant.firestoreMetadata.id).subscribe();
  }

  deleteAllRestaurants(): void {
    this.restaurantFsService.deleteAllRestaurants$().subscribe();
  }

  selectMockRestaurant(restaurant: RestaurantItem): void {
    this.selectedMockRestaurant = restaurant;
  }

  selectRestaurant(restaurant: FireItem<RestaurantItem> | null): void {
    this.selectedRestaurant$.next(restaurant);
  }

  /**
   * Just a method to show an example of changeDocId$
   */
  changeIdOfRestaurantToRandom(restaurant: FireItem<RestaurantItem>): void {
    const randomId = Math.random().toString(36).substr(10, 15);
    this.restaurantFsService.changeIdOfRestaurant$(restaurant, randomId).subscribe();
  }

}
