'use client';

import { Input } from '@/components/ui/input';
import { isValidPersonLinkedInUrl } from '@/lib/linkedin-url';

type LinkedInUrlInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  'data-testid'?: string;
};

/** Validates on blur and when value changes; does not block typing. */
export function LinkedInUrlInput({
  value,
  onChange,
  placeholder = 'https://linkedin.com/in/username',
  className,
  disabled,
  id,
  ...props
}: LinkedInUrlInputProps) {
  const validation = value.trim() ? isValidPersonLinkedInUrl(value) : { valid: true as boolean, message: undefined };
  const showError = value.trim() && !validation.valid;

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        type="url"
        autoComplete="off"
        {...props}
      />
      {showError && validation.message && (
        <p className="text-xs text-red-400" role="alert">
          {validation.message}
        </p>
      )}
    </div>
  );
}
