export interface MenuItem {
  label?: string;
  callback?: () => void;
  isSeparator?: boolean;
}

interface MenuState {
  items: MenuItem[];
  x: number;
  y: number;
}

let current: MenuState | null = null;
const subscribers = new Set<() => void>();

export const getContextMenu = () => current;
export const subscribeContextMenu = (callback: () => void) => {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};
export function openContextMenu(items: MenuItem[], position: { x: number; y: number }) {
  current = { items, ...position };
  subscribers.forEach((callback) => callback());
}
export function closeContextMenu() {
  current = null;
  subscribers.forEach((callback) => callback());
}
