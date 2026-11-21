import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { closeContextMenu, getContextMenu, subscribeContextMenu } from '../utils/contextMenu';
import './ContextMenu.css';

export default function ContextMenu() {
  const menu = useSyncExternalStore(subscribeContextMenu, getContextMenu);
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!menu || !element) return;
    if (!element.contains(document.activeElement)) previousFocus.current = document.activeElement;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(0, Math.min(menu.x, window.innerWidth - bounds.width))}px`;
    element.style.top = `${Math.max(0, Math.min(menu.y, window.innerHeight - bounds.height))}px`;
    element.querySelector('button')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const outside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) closeContextMenu();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeContextMenu();
        if (previousFocus.current instanceof HTMLElement && previousFocus.current.isConnected)
          previousFocus.current.focus();
      }
      if (event.key === 'Tab') closeContextMenu();
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const buttons = Array.from(ref.current?.querySelectorAll('button') || []);
        const index = buttons.findIndex((button) => button === document.activeElement);
        buttons[
          (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        ]?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', keydown);
    window.addEventListener('blur', closeContextMenu);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('blur', closeContextMenu);
    };
  }, [menu]);

  if (!menu) return null;
  return createPortal(
    <div ref={ref} role="menu" className="app-context-menu" style={{ left: menu.x, top: menu.y }}>
      {menu.items.map((item, index) =>
        item.isSeparator ? (
          <div key={index} role="separator" className="app-context-menu-separator" />
        ) : (
          <button
            key={index}
            role="menuitem"
            onClick={() => {
              closeContextMenu();
              item.callback?.();
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
