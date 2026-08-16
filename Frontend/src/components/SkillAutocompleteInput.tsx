import {
  type InputHTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { careerfitApi } from '../lib/api';

type SkillAutocompleteInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  language?: 'vi' | 'en';
};

function activeSkillToken(value: string) {
  const parts = value.split(',');
  return parts[parts.length - 1]?.trim() ?? '';
}

export function SkillAutocompleteInput({
  value,
  defaultValue = '',
  onValueChange,
  language = 'vi',
  className,
  ...inputProps
}: SkillAutocompleteInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedKeywordRef = useRef('');
  const listboxId = useId();
  const currentValue = value ?? internalValue;
  const keyword = activeSkillToken(currentValue);

  useEffect(() => {
    const normalizedKeyword = keyword.toLocaleLowerCase();
    if (selectedKeywordRef.current === normalizedKeyword) {
      selectedKeywordRef.current = '';
      setLoading(false);
      setOpen(false);
      return;
    }

    if (keyword.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await careerfitApi.getSkillSuggestions(keyword, 10, controller.signal);
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
  }, [keyword]);

  function updateValue(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  function selectSuggestion(suggestion: string) {
    const parts = currentValue.split(',');
    const completed = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
    const hasSuggestion = completed.some(
      (part) => part.localeCompare(suggestion, undefined, { sensitivity: 'accent' }) === 0,
    );
    const nextSkills = hasSuggestion ? completed : [...completed, suggestion];
    selectedKeywordRef.current = suggestion.toLocaleLowerCase();
    updateValue(nextSkills.join(', '));
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Escape') setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <span className="skill-autocomplete">
      <input
        {...inputProps}
        ref={inputRef}
        className={className}
        value={currentValue}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        onChange={(event) => updateValue(event.target.value)}
        onFocus={() => setOpen(keyword.length >= 2 && suggestions.length > 0)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
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
              onClick={() => selectSuggestion(suggestion)}
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
