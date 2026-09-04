"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id: string;
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
};

type MenuCoords = {
  top: number;
  left: number;
  width: number;
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  name,
  "aria-label": ariaLabel,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [highlight, setHighlight] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );

  const selected =
    options.find((option) => option.value === value) || options[0];

  const close = useCallback(() => setOpen(false), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const onReposition = () => updatePosition();

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, updatePosition]);

  useEffect(() => {
    setHighlight(
      Math.max(
        0,
        options.findIndex((option) => option.value === value),
      ),
    );
  }, [value, options]);

  const selectAt = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        selectAt(highlight);
      } else if (event.key === "ArrowDown") {
        setHighlight((prev) => (prev + 1) % options.length);
      } else if (event.key === "ArrowUp") {
        setHighlight((prev) => (prev - 1 + options.length) % options.length);
      }
    }
  };

  const menu =
    open && coords ? (
      <ul
        ref={menuRef}
        id={listId}
        className="custom-select__menu"
        role="listbox"
        aria-labelledby={id}
        style={{
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === highlight;
          return (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-select__option${
                  isSelected ? " is-selected" : ""
                }${isActive ? " is-active" : ""}`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectAt(index)}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div
      className={`custom-select${open ? " is-open" : ""}${
        disabled ? " is-disabled" : ""
      }`}
      ref={rootRef}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span>{selected?.label}</span>
        <span className="custom-select__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
