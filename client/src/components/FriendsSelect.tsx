import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function FriendsSelect({ label, value, options, onChange, disabled, fullWidth }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const selected = Math.max(0, options.findIndex((option) => option.value === value));

  useLayoutEffect(() => {
    const panel = menu.current;
    if (!open || disabled || !panel) return;
    // The top layer keeps rounded menus visible outside scrolling cards and inside dialogs.
    panel.setAttribute('popover', 'manual');
    panel.showPopover();
    const position = () => {
      const rect = trigger.current!.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 18;
      const above = rect.top - 18;
      const upward = below < Math.min(panel.scrollHeight, 240) && above > below;
      const maxHeight = Math.max(0, Math.min(240, upward ? above : below));
      panel.style.width = `${width}px`;
      panel.style.maxHeight = `${maxHeight}px`;
      panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      panel.style.top = `${upward ? rect.top - panel.getBoundingClientRect().height - 6 : rect.bottom + 6}px`;
    };
    position();
    panel.querySelectorAll<HTMLButtonElement>('[role=option]')[selected]?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      panel.hidePopover();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, disabled, selected, options.length]);

  function close() { setOpen(false); trigger.current?.focus(); }

  return <div ref={root} className={`friends-select${fullWidth ? ' friends-select-wide' : ''}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="friends-select-trigger" disabled={disabled} aria-label={label}
      aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={open && !disabled ? id : undefined}
      onClick={() => setOpen(!open)} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
        if (event.key === 'Escape') close();
      }}>
      <span>{options.find((option) => option.value === value)?.label || label}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && !disabled && <div ref={menu} id={id} role="listbox" aria-label={label} className="friends-select-menu"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=option]'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % items.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else return;
        event.preventDefault(); items[next]?.focus();
      }}>
      {options.map((option) => <button key={option.value} type="button" role="option" tabIndex={-1}
        aria-selected={option.value === value} onClick={() => { onChange(option.value); close(); }}>
        <span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
