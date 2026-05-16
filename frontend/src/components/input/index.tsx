import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import {
  Button,
  FieldError,
  Input as RACInput,
  Label,
  SearchField,
  type SearchFieldProps,
  TextField,
  type TextFieldProps,
} from 'react-aria-components';
import { XMark } from '../../icons/circle-xmark';
import { cn } from '../../utils/string-formatting';

const labelStyles =
  'text-sm cursor-pointer pb-2 text-zinc-500 dark:text-zinc-300';

const inputStyles =
  'bg-zinc-150 dark:bg-zinc-700 py-1 px-2 rounded-md border-2 border-zinc-300 dark:border-zinc-600 w-full outline-none focus:border-(--accent-color)';

type ExtraInputAttrs = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'name'
  | 'type'
  | 'autoFocus'
  | 'autoComplete'
  | 'autoCorrect'
  | 'maxLength'
  | 'minLength'
  | 'pattern'
  | 'placeholder'
  | 'className'
  | 'id'
  | 'disabled'
  | 'readOnly'
  | 'required'
>;

type SharedExtras = {
  label?: string;
  placeholder?: string;
  inputClassName?: string;
  errorMessage?: ReactNode;
  inputAttrs?: ExtraInputAttrs;
  /** Routed to the underlying input element. */
  autoCapitalize?: string;
  /** Accepts boolean or string; coerced to react-aria's string form. */
  spellCheck?: boolean | 'true' | 'false';
  ref?: Ref<HTMLInputElement>;
};

function spellCheckToString(
  value: boolean | 'true' | 'false' | undefined
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value;
}

type AppTextFieldProps = Omit<TextFieldProps, 'spellCheck'> & SharedExtras;

export function AppTextField({
  ref,
  label,
  placeholder,
  inputClassName,
  errorMessage,
  className,
  maxLength = 75,
  inputAttrs,
  autoCapitalize,
  spellCheck,
  ...props
}: AppTextFieldProps) {
  return (
    <TextField
      {...props}
      spellCheck={spellCheckToString(spellCheck)}
      maxLength={maxLength}
      className={cn('flex flex-col', className as string | undefined)}
    >
      {label && <Label className={labelStyles}>{label}</Label>}
      <RACInput
        {...inputAttrs}
        ref={ref}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        className={cn(inputStyles, inputClassName)}
      />
      {errorMessage && (
        <FieldError className="text-red-500 text-xs pt-1">
          {errorMessage}
        </FieldError>
      )}
    </TextField>
  );
}

type AppSearchFieldProps = Omit<SearchFieldProps, 'spellCheck'> & SharedExtras;

export function AppSearchField({
  ref,
  label,
  placeholder,
  inputClassName,
  errorMessage,
  className,
  maxLength = 75,
  inputAttrs,
  autoCapitalize,
  spellCheck,
  ...props
}: AppSearchFieldProps) {
  return (
    <SearchField
      {...props}
      spellCheck={spellCheckToString(spellCheck)}
      maxLength={maxLength}
      className={cn(
        'flex flex-col relative group',
        className as string | undefined
      )}
    >
      {label && <Label className={labelStyles}>{label}</Label>}
      <RACInput
        {...inputAttrs}
        ref={ref}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        className={cn(inputStyles, 'pr-8', inputClassName)}
      />
      <Button
        slot="clear"
        aria-label="Clear"
        className={cn(
          'absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 group-empty:hidden outline-none focus-visible:ring-2 focus-visible:ring-(--accent-color) rounded',
          label && 'top-[calc(50%+0.625rem)]'
        )}
      >
        <XMark width="1rem" height="1rem" fill="currentColor" />
      </Button>
      {errorMessage && (
        <FieldError className="text-red-500 text-xs pt-1">
          {errorMessage}
        </FieldError>
      )}
    </SearchField>
  );
}
