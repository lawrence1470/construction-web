'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageDropzoneProps {
  value?: string;
  onChange: (imageUrl: string | undefined) => void;
  className?: string;
  disabled?: boolean;
}

export function ImageDropzone({
  value,
  onChange,
  className,
  disabled = false,
}: ImageDropzoneProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setIsLoading(true);

      // Convert file to base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onChange(result);
        setIsLoading(false);
      };
      reader.onerror = () => {
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: disabled || isLoading,
  });

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(undefined);
    },
    [onChange]
  );

  if (value) {
    return (
      <div className={cn('relative group', className)}>
        <img
          src={value}
          alt="Cover"
          className="w-full h-32 object-cover rounded-lg"
        />
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        'border-gray-200 dark:border-[var(--border-color)]',
        'hover:border-gray-300 dark:hover:border-gray-600',
        isDragActive && 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      <ImagePlus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">
          {isDragActive ? 'Drop image here' : 'Drag & drop or click'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          PNG, JPG, GIF up to 5MB
        </p>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-lg">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default ImageDropzone;
