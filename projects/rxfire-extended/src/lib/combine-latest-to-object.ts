import { combineLatest, noop, Observable } from 'rxjs';
import {map, startWith, tap } from 'rxjs/operators';

export interface OperatorDict<X> {
  [key: string]: Observable<X> | [Observable<X>, X];
}

/**
 * Extracts the type `T` of an `Observable<T>`
 */
export type ExtractObservableType<A> = A extends Observable<infer B> ? B : never;


const nop = <T>() => tap<T>(noop);

/**
 * Takes a key/value object of observables or tuples:
 *
 * ```
 * {
 *  obs1: of(123),
 *  obs2: [of("value").pipe(delay(1000)), "startWith value"],
 * }
 * ```
 *
 * and every time one of the source observables emits, emits an object
 * with the latest value from all observables:
 *
 * ```
 * {
 *  obs1: 123,
 *  obs2: "startWith value",
 * }
 * ```
 */
export const combineLatestToObject = <
  TIn extends OperatorDict<any>, TOut extends { [K in keyof TIn]: ExtractObservableType<TIn[K]> }
  // TOut extends { [K in keyof TIn]: ExtractObservableType<TIn[K] extends Array<any> ? TIn[K][0] : TIn[K]> }

  >(observables: TIn): Observable<TOut> => {
  const keys = Object.keys(observables);

  return combineLatest(
    keys.map(k => {
      const obs = observables[k];

      return Array.isArray(obs)
        ? obs[0].pipe(startWith(obs[1]))
        : obs.pipe( nop());
    }),
  ).pipe(
    map(b => b.reduce((acc, val, i) => ({ ...acc, [keys[i]]: val }), {}))
  );
};
