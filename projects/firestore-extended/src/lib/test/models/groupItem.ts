import {FireItemWithIndexGroup} from '../../models/fireItem';

export interface DragAndDropItem extends FireItemWithIndexGroup {
  data: string;
}

export interface DragAndDropContainer {
  items: DragAndDropItem[];
}
