export interface DragAndDropItem {
  index: number;
  groupName: string;
  data: string;
}

export interface DragAndDropContainer {
  items: DragAndDropItem[];
}
