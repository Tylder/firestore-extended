
/* For Listening to a Doc and multiple sub collections in that doc */

import firebase from 'firebase';
import {QueryFn} from './interfaces';

/**
 * For Listening to a Document and multiple sub Collections in that Document
 */

export interface SubCollectionQuery {

  /** the name of the subCollection to be read. */
  name: string;

  /** Specified Document name if multiple documents in collection is not used */
  docId?: string;

  /** Any SubCollections to be read in the Collection */
  subCollections?: SubCollectionQuery[];

  /**
   *
   * The Collection QueryFn.
   *
   * Example:
   * const query = ref.where('type', '==', 'Book')
   *                  .where('price', '>' 18.00)
   *                  .where('price', '<' 100.00)
   *                  .where('category', '==', 'Fiction')
   *                  .where('publisher', '==', 'BigPublisher')
   *
   */
  queryFn?: QueryFn;
}
