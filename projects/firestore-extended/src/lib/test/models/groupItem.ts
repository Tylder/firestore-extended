import {ItemWithIndexGroup} from '../../models/fireItem';

export interface DragAndDropItem extends ItemWithIndexGroup {
  data: string;
}

export interface DragAndDropContainer {
  items: DragAndDropItem[];
}
