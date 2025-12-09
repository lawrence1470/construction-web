# Loading State Strategy - Implementation Guide

## Overview
Comprehensive loading state implementation for Next.js 15 App Router with multiple loading patterns for different use cases.

## Architecture

### 1. **LoadingSpinner Component** (`/src/components/ui/LoadingSpinner.tsx`)
Reusable animated spinner with multiple configurations:

**Features:**
- Multiple sizes: `sm`, `md`, `lg`, `xl`
- Full-screen overlay mode
- Optional loading text
- Framer Motion animations for smooth transitions

**Usage Examples:**
```tsx
// Basic inline spinner
<LoadingSpinner size="md" />

// Full-screen with text
<LoadingSpinner size="lg" fullScreen text="Processing..." />

// Small spinner for buttons
<LoadingSpinner size="sm" />
```

### 2. **Route-Level Loading** (Next.js 15 `loading.tsx`)
Automatic loading UI during route transitions using Next.js built-in support.

**Files Created:**
- `/src/app/loading.tsx` - Root-level loading
- `/src/app/dashboard/loading.tsx` - Dashboard-specific loading

**How It Works:**
- Next.js automatically shows `loading.tsx` during page transitions
- Wraps page content in React Suspense boundary
- No additional code needed in pages

**Benefits:**
- Zero configuration in page components
- Automatic streaming and progressive rendering
- Works with Server Components

### 3. **Component-Level Loading** (UserMenu with useTransition)
Loading states for async actions like logout, form submissions, etc.

**Implementation in UserMenu:**
```tsx
const [isLoggingOut, setIsLoggingOut] = useState(false);
const [isPending, startTransition] = useTransition();

const handleLogout = async () => {
  setIsLoggingOut(true);
  try {
    await signOut();
    setIsOpen(false);

    startTransition(() => {
      router.push('/sign-in');
    });
  } catch (error) {
    console.error('Logout failed:', error);
    setIsLoggingOut(false);
  }
};
```

**Features:**
- Button disabled state during logout
- Inline spinner in menu item
- Full-screen overlay during transition
- Error handling with state reset

### 4. **Global Loading Context** (`/src/components/providers/LoadingProvider.tsx`)
Programmatic control over loading state from anywhere in the app.

**Setup:**
Provider added to root layout wrapping all pages.

**API:**
```tsx
const { isLoading, showLoading, hideLoading } = useLoading();

// Show loading
showLoading('Custom message...');

// Hide loading
hideLoading();
```

**Use Cases:**
- Long-running operations
- Multi-step processes
- API calls without built-in loading UI
- Custom async workflows

## Implementation Examples

### Example 1: Using in a Form Submission
```tsx
'use client';

import { useLoading } from '@/components/providers/LoadingProvider';

export default function MyForm() {
  const { showLoading, hideLoading } = useLoading();

  async function handleSubmit(data: FormData) {
    showLoading('Saving data...');
    try {
      await saveData(data);
    } finally {
      hideLoading();
    }
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 2: Navigation with Loading
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function MyButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      router.push('/another-page');
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? <LoadingSpinner size="sm" /> : 'Navigate'}
    </button>
  );
}
```

### Example 3: Custom Async Operation
```tsx
'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DataFetcher() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  async function fetchData() {
    setLoading(true);
    try {
      const result = await fetch('/api/data');
      setData(await result.json());
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Fetching data..." />;
  }

  return <div>{/* Render data */}</div>;
}
```

## Best Practices

### 1. **Choose the Right Loading Pattern**
- **Route transitions**: Use `loading.tsx` files (automatic)
- **Button actions**: Use `useTransition` hook
- **Form submissions**: Use local state or `useLoading` context
- **Global operations**: Use `LoadingProvider` context

### 2. **User Experience Guidelines**
- Show loading immediately on user action (no delay)
- Include descriptive text for operations >1 second
- Disable interactive elements during loading
- Handle errors gracefully with state cleanup

### 3. **Performance Considerations**
- Use `useTransition` for non-urgent updates
- Prefer route-level loading for navigation
- Keep loading states close to affected UI
- Avoid multiple full-screen overlays simultaneously

### 4. **Accessibility**
- All loading states are keyboard accessible
- Buttons properly disabled during operations
- Loading text provides context for screen readers

## Testing Checklist

- [ ] Logout shows spinner and redirects to login
- [ ] Page navigation shows loading.tsx overlay
- [ ] Dashboard loads with custom loading message
- [ ] Buttons are disabled during async operations
- [ ] Loading overlays appear/disappear smoothly
- [ ] Error states reset loading indicators
- [ ] Multiple simultaneous operations handled correctly

## Files Modified/Created

### Created:
1. `/src/components/ui/LoadingSpinner.tsx` - Reusable spinner component
2. `/src/app/loading.tsx` - Root-level loading UI
3. `/src/app/dashboard/loading.tsx` - Dashboard loading UI
4. `/src/components/providers/LoadingProvider.tsx` - Global loading context

### Modified:
1. `/src/components/layout/UserMenu.tsx` - Added logout loading state
2. `/src/app/layout.tsx` - Added LoadingProvider wrapper

## Future Enhancements

- [ ] Add skeleton loading states for specific content areas
- [ ] Implement progress indicators for multi-step operations
- [ ] Add loading state persistence during page refresh
- [ ] Create loading variants for different themes (light/dark)
- [ ] Add timeout handling for stuck loading states
