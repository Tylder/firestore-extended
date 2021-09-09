import {ModuleWithProviders, NgModule, Optional, SkipSelf} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FirebaseConfig} from './config';


@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class NgxFirestoreExtendedModule {

  constructor(@Optional() @SkipSelf() parentModule?: NgxFirestoreExtendedModule) {
    if (parentModule) {
      throw new Error(
        'NgxFirestoreExtendedModule is already loaded. Import it in the AppModule only');
    }
  }

  static forRoot(config?: FirebaseConfig): ModuleWithProviders<NgxFirestoreExtendedModule> {
    return {
      ngModule: NgxFirestoreExtendedModule,
      providers: [
        {provide: FirebaseConfig, useValue: config}
      ]
    };
  }

}
