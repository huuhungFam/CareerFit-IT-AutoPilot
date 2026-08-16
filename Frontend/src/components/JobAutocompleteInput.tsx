import {
  type InputHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { careerfitApi, type JobSuggestionField } from '../lib/api';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> & {
  field: JobSuggestionField;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  language?: 'vi' | 'en';
};

export function JobAutocompleteInput({
  field,
  value,
  defaultValue = '',
  onValueChange,
  language = 'vi',
  ...inputProps
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const currentValue = value ?? internalValue;

  useEffect(() => {
    const keyword = currentValue.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await careerfitApi.getJobFieldSuggestions(keyword, field, controller.signal);
        setSuggestions(result);
        setOpen(document.activeElement === inputRef.current && result.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentValue, field]);

  function update(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  }

  function choose(suggestion: string) {
    update(suggestion);
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <span className="skill-autocomplete">
      <input
        {...inputProps}
        ref={inputRef}
        value={currentValue}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        onChange={(event) => update(event.target.value)}
        onFocus={() => setOpen(currentValue.trim().length >= 2 && suggestions.length > 0)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <span className="skill-autocomplete-dropdown" id={listboxId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <button
              id={`${listboxId}-${index}`}
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </span>
      ) : null}
      {loading ? (
        <span className="skill-autocomplete-status" aria-live="polite">
          {language === 'vi' ? 'Đang tìm...' : 'Searching...'}
        </span>
      ) : null}
    </span>
  );
}
