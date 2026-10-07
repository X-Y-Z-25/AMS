import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { classNames } from "@/lib/utils";

const inputBase =
  "h-10 w-full rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchInputProps) {
  return (
    <div className={classNames("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={classNames(inputBase, "pl-10")}
      />
    </div>
  );
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={classNames(
        "h-10 rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors",
        className,
      )}
    >
      {placeholder && (
        <option value="" className="bg-slate-800">
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-slate-800">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  readOnly = false,
  disabled = false,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      className={classNames(
        inputBase,
        className,
        readOnly && "cursor-default opacity-90",
        disabled && "cursor-not-allowed opacity-60",
      )}
    />
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
  hint?: string;
}

export function Field({
  label,
  children,
  required,
  className,
  hint,
}: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={classNames(
        "w-full rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-none",
        className,
      )}
    />
  );
}
