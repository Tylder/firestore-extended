import {ModuleWithProviders, NgModule, Optional, SkipSelf} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FirebaseConfig} from './config';


@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})


export class NgxFirebaseModule {
  /**
   * To be used as an Angular Module to inject the FirebaseConfig
   * The FirebaseConfig is then used by NgxFirebaseService to create a Firebase app, this contains the websocket connection to firebase.
   * We can then inject NgxRxFireService in to any service that wishes to use the Firebase app connection without creating
   * additional connections.
   * The purpose is simply to make sure that we only create a single Firebase App and a single connection
   */
  constructor(@Optional() @SkipSelf() parentModule?: NgxFirebaseModule) {
    if (parentModule) {
      throw new Error(
        'NgxFirestoreExtendedModule is already loaded. Import it in the AppModule only');
    }
  }

  static forRoot(config?: FirebaseConfig): ModuleWithProviders<NgxFirebaseModule> {
    return {
      ngModule: NgxFirebaseModule,
      providers: [
        {provide: FirebaseConfig, useValue: config}
      ]
    };
  }

}
