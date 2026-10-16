export interface UserProfile {
  familyId: string | null;
  displayName: string;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  members: string[];
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
}

export interface Item {
  id: string;
  name: string;
  key: string;
  qty: string;
  note: string;
  category: string;
  inCart: boolean;
  addedByName: string;
  createdAt: number;
}

export type { CatalogEntry } from '../utils';
