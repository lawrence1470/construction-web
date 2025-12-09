# Loading State Examples

## Visual Flow Examples

### 1. Logout Flow
```
User clicks "Logout" button
→ Button shows inline spinner + "Logging out..."
→ Button disabled (grey, no hover)
→ Full-screen overlay appears with large spinner
→ signOut() completes
→ router.push('/sign-in') with useTransition
→ Next.js shows /sign-in route's loading.tsx
→ Sign-in page renders
```

### 2. Page Navigation Flow
```
User clicks navigation link
→ Next.js detects route change
→ Shows loading.tsx with full-screen spinner
→ Server Component loads data
→ Page renders with data
→ Loading overlay fades out
```

### 3. Dashboard Load Flow
```
User navigates to /dashboard
→ Shows /dashboard/loading.tsx ("Loading dashboard...")
→ Dashboard Server Component loads
→ Gantt chart data fetches
→ Dashboard page renders
→ Loading overlay fades out
```

## Code Snippets for Common Patterns

### Pattern 1: Button with Action Loading
```tsx
'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export function ActionButton() {
  const [loading, setLoading] = useState(false);

  async function handleAction() {
    setLoading(true);
    try {
      await performAction();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>Processing...</span>
        </div>
      ) : (
        'Submit'
      )}
    </button>
  );
}
```

### Pattern 2: Navigation with Transition
```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <a href={href} onClick={handleClick}>
      {isPending ? <LoadingSpinner size="sm" /> : children}
    </a>
  );
}
```

### Pattern 3: Global Loading for Multi-Step Process
```tsx
'use client';

import { useLoading } from '@/components/providers/LoadingProvider';

export function MultiStepForm() {
  const { showLoading, hideLoading } = useLoading();

  async function handleSubmit() {
    showLoading('Step 1: Validating...');
    await validateData();

    showLoading('Step 2: Uploading files...');
    await uploadFiles();

    showLoading('Step 3: Saving...');
    await saveData();

    hideLoading();
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pattern 4: Inline Content Loading
```tsx
'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export function DataCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const result = await fetch('/api/data');
      setData(await result.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg flex items-center justify-center">
        <LoadingSpinner size="md" text="Loading data..." />
      </div>
    );
  }

  return <div className="p-6 bg-white rounded-lg">{/* Render data */}</div>;
}
```

## Spinner Size Reference

| Size | Dimensions | Best For |
|------|------------|----------|
| `sm` | 16px | Buttons, inline elements |
| `md` | 32px | Cards, small sections |
| `lg` | 48px | Full-screen overlays, page loading |
| `xl` | 64px | Splash screens, major operations |

## Animation Details

### Spinner Rotation
- Duration: 1 second per rotation
- Easing: Linear (constant speed)
- Border: 4px solid
- Colors: Gray 200 background, Gray 800 indicator

### Overlay Transitions
- Fade in: 300ms
- Fade out: 300ms
- Backdrop blur: Applied
- Background: White 80% opacity

### Text Appearance
- Delay: 200ms (prevents flash for quick operations)
- Fade in: Smooth opacity transition
- Color: Gray 600
- Size: 14px (text-sm)

## Loading State Hierarchy

1. **Full-screen** (Highest priority)
   - Used for: Route transitions, logout, critical operations
   - Blocks: All interaction
   - Example: `<LoadingSpinner size="lg" fullScreen />`

2. **Section/Card** (Medium priority)
   - Used for: Data fetching, component updates
   - Blocks: Only that section
   - Example: Conditional render in component

3. **Inline** (Lowest priority)
   - Used for: Buttons, small actions
   - Blocks: Only that element
   - Example: Spinner inside button

## Accessibility Features

- Loading spinners use CSS animations (no JavaScript required)
- Text provides context for screen readers
- Disabled states prevent accidental interactions
- Focus management during transitions
- ARIA labels can be added if needed

## Performance Considerations

### Do's ✅
- Use route-level loading.tsx for navigation
- Implement useTransition for non-urgent updates
- Show loading immediately on user action
- Clean up loading state in finally blocks

### Don'ts ❌
- Don't delay showing loading indicators
- Don't stack multiple full-screen overlays
- Don't forget error handling
- Don't leave loading state active after errors

## Testing Guide

### Manual Testing
1. **Logout Flow**
   - Click logout button
   - Verify button shows spinner
   - Verify full-screen overlay appears
   - Verify redirect to /sign-in works

2. **Page Navigation**
   - Click any navigation link
   - Verify loading.tsx appears
   - Verify smooth transition to new page

3. **Dashboard Load**
   - Navigate to /dashboard
   - Verify custom "Loading dashboard..." text
   - Verify data renders after loading

### Edge Cases to Test
- Fast operations (< 100ms)
- Slow operations (> 3s)
- Network errors during loading
- Multiple simultaneous operations
- Browser back button during loading
- Page refresh during loading
