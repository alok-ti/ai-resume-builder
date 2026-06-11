'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Edit2 } from 'lucide-react';

interface EditableTextProps {
  fieldName: string;
  value: string;
  placeholder?: string;
  className?: string;
  as?: React.ElementType;
  isHtml?: boolean;
}

export function EditableText({
  fieldName,
  value,
  placeholder = 'Click to edit...',
  className = '',
  as: Element = 'span',
  isHtml = false,
}: EditableTextProps) {
  const formContext = useFormContext();
  const elementRef = useRef<HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal DOM text only when the value changes externally and we are not currently focused
  useEffect(() => {
    if (elementRef.current && !isFocused) {
      if (isHtml) {
        elementRef.current.innerHTML = value || '';
      } else {
        elementRef.current.textContent = value || '';
      }
    }
  }, [value, isHtml, isFocused]);

  // If we're not inside a FormProvider, render static content
  if (!formContext) {
    if (isHtml) {
      return <Element className={className} dangerouslySetInnerHTML={{ __html: value || '' }} />;
    }
    return <Element className={className}>{value || placeholder}</Element>;
  }

  const { setValue } = formContext;

  const handleBlur = () => {
    setIsFocused(false);
    if (!elementRef.current) return;

    const newValue = isHtml ? elementRef.current.innerHTML : (elementRef.current.textContent || '');
    if (newValue !== value) {
      setValue(fieldName, newValue, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isHtml && !e.shiftKey) {
      e.preventDefault();
      elementRef.current?.blur();
    }
  };

  return (
    <span
      className="inline-relative group/editable max-w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Element
        ref={elementRef as any}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:bg-indigo-500/5 rounded px-0.5 transition-all select-text cursor-text min-h-[1em] min-w-[15px] inline-block ${
          isHovered ? 'ring-1 ring-dashed ring-indigo-400/40 bg-indigo-500/5' : ''
        } ${className}`}
        style={{ outline: 'none' }}
      />
      {isHovered && !isFocused && (
        <span className="absolute -top-1.5 -right-3.5 bg-indigo-600 text-white rounded p-0.5 shadow-md pointer-events-none scale-75 animate-fade-in z-20">
          <Edit2 className="w-2.5 h-2.5" />
        </span>
      )}
    </span>
  );
}
