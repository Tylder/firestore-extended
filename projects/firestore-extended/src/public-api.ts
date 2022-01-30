/*
 * Public API Surface of firestore-extended.ts
 */
/* Base Api exports */
export * from './lib/models/fireItem';
export * from './lib/firestore-extended';
export * from './lib/sub-collection-query';
export * from './lib/sub-collection-writer';
export * from './lib/helpers';
export * from './lib/interfaces';

/* Helper functions */
export * from './lib/rxjs-ops/combine-latest-to-object';

/* Wrappers and Convenience Classes */
export * from './lib/firestore-extended.class';
export * from './lib/firestore-wrapper';

/* Angular Exports */
export * from './lib/ngx/config';
export * from './lib/ngx/ngx-firebase.module';
export * from './lib/ngx/ngx-firebase.service';
export * from './lib/ngx/ngx-firestore-ext.service';

