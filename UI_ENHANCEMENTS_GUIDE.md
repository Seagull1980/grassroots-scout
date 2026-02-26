# UI Enhancements - Usage Guide

This guide shows how to use the new UI components and features implemented for modernizing the website.

## 🎨 New Components

### 1. EnhancedToast - Beautiful Toast Notifications

**Import:**
```tsx
import EnhancedToast, { useToast } from '../components/EnhancedToast';
```

**Usage:**
```tsx
function MyComponent() {
  const { toast, showSuccess, showError, showWarning, showInfo, closeToast } = useToast();

  const handleSubmit = async () => {
    try {
      await someApiCall();
      showSuccess('Your changes have been saved successfully!', 'Success');
    } catch (error) {
      showError('Failed to save changes. Please try again.', 'Error');
    }
  };

  return (
    <>
      <Button onClick={handleSubmit}>Submit</Button>
      <EnhancedToast message={toast} onClose={closeToast} />
    </>
  );
}
```

**Toast Types:**
- `showSuccess(message, title?)` - Green success toast
- `showError(message, title?)` - Red error toast
- `showWarning(message, title?)` - Orange warning toast
- `showInfo(message, title?)` - Blue info toast

### 2. LoadingButton - Button with Loading State

**Import:**
```tsx
import LoadingButton from '../components/LoadingButton';
```

**Usage:**
```tsx
function MyForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await submitForm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      loading={loading}
      onClick={handleSubmit}
      variant="contained"
      color="primary"
    >
      Submit Form
    </LoadingButton>
  );
}
```

### 3. useLoadingState Hook - Easy Loading State Management

**Import:**
```tsx
import { useLoadingState } from '../hooks/useLoadingState';
```

**Usage:**
```tsx
function MyComponent() {
  const { loading, start, stop } = useLoadingState();

  const handleAction = async () => {
    start();
    try {
      await performAction();
    } finally {
      stop();
    }
  };

  return <LoadingButton loading={loading} onClick={handleAction}>Action</LoadingButton>;
}
```

### 4. PageTransition - Smooth Page Animations

**Import:**
```tsx
import PageTransition from '../components/PageTransition';
```

**Usage:**
```tsx
function MyPage() {
  return (
    <PageTransition>
      <Container>
        {/* Your page content */}
      </Container>
    </PageTransition>
  );
}
```

### 5. Enhanced Skeleton Loaders

**Import:**
```tsx
import {
  SearchCardSkeleton,
  SearchResultsSkeleton,
  DashboardCardSkeleton,
  ProfileCardSkeleton,
  ListItemSkeleton,
} from '../components/SkeletonLoaders';
```

**Usage:**
```tsx
function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  if (loading) {
    return <SearchResultsSkeleton count={3} />;
  }

  return (
    <Box>
      {results.map(result => (
        <ResultCard key={result.id} data={result} />
      ))}
    </Box>
  );
}
```

## ✨ Automatic Features

### Navigation Bar Enhancements

The navbar now automatically includes:

1. **Scroll Detection with Blur Effect**
   - Navbar background becomes slightly transparent with blur when scrolled
   - Enhanced shadow for better elevation
   - Smooth transitions between states

2. **Active Page Highlighting**
   - Current page is highlighted with primary color
   - Blue underline indicator on active navigation items
   - Enhanced hover states with color transitions

3. **Mobile Drawer Improvements**
   - Gradient header with user info
   - Staggered animations for menu items
   - Smooth backdrop blur effect

### CSS Animations

Global animations are now available:

```css
/* Automatically applied to interactive elements */
- Smooth scroll behavior
- Focus states for accessibility
- Transition effects on buttons, links, inputs

/* Animation classes available */
.page-content - Fade-in animation
@keyframes fadeIn - Custom fade-in
@keyframes slideInFromRight - Slide from right
@keyframes fadeInScale - Scale with fade
```

## 🎯 Best Practices

1. **Use LoadingButton for async actions**
   ```tsx
   <LoadingButton loading={isSubmitting} onClick={handleSubmit}>
     Save Changes
   </LoadingButton>
   ```

2. **Show feedback with EnhancedToast**
   ```tsx
   // On success
   showSuccess('Operation completed successfully!');
   
   // On error
   showError('Something went wrong. Please try again.');
   ```

3. **Use skeleton loaders while fetching data**
   ```tsx
   {loading ? <SearchResultsSkeleton /> : <ResultsList data={results} />}
   ```

4. **Wrap pages with PageTransition for smooth navigation**
   ```tsx
   function DashboardPage() {
     return (
       <PageTransition>
         {/* page content */}
       </PageTransition>
     );
   }
   ```

## 🚀 Component Examples

### Complete Form with Loading & Toast

```tsx
function ContactForm() {
  const { loading, start, stop } = useLoadingState();
  const { toast, showSuccess, showError, closeToast } = useToast();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    start();
    
    try {
      await api.post('/contact', formData);
      showSuccess('Message sent successfully! We\'ll get back to you soon.', 'Success');
      setFormData({});
    } catch (error) {
      showError('Failed to send message. Please try again.', 'Error');
    } finally {
      stop();
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* form fields */}
        <LoadingButton
          loading={loading}
          type="submit"
          variant="contained"
          fullWidth
        >
          Send Message
        </LoadingButton>
      </form>
      <EnhancedToast message={toast} onClose={closeToast} />
    </>
  );
}
```

### Search Page with Skeletons

```tsx
function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await api.get('/search');
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <Container>
        <Typography variant="h4">Search Results</Typography>
        
        {loading ? (
          <SearchResultsSkeleton count={5} />
        ) : (
          results.map(result => (
            <SearchCard key={result.id} data={result} />
          ))
        )}
      </Container>
    </PageTransition>
  );
}
```

## 📝 Notes

- All animations respect `prefers-reduced-motion` for accessibility
- Focus states are visible for keyboard navigation
- Smooth scroll behavior works across all browsers
- Toast notifications auto-dismiss after 5 seconds (configurable)
- Skeleton loaders use wave animation for better UX
