# RentPi Frontend

A modern, scalable React frontend for the RentPi rental marketplace platform.

## Architecture Overview

This frontend follows enterprise-grade architecture patterns with clear separation of concerns:

```
src/
├── api/                    # API communication layer
│   └── client.js           # Axios-based HTTP client with interceptors
├── components/             # Reusable UI components
│   ├── common/             # Generic UI primitives (Button, Input, Badge, etc.)
│   ├── layout/             # Layout components (Header, Layout)
│   ├── products/           # Product-related components
│   ├── chat/               # Chat interface components
│   └── analytics/          # Analytics visualization components
├── context/                # React Context for global state
│   └── AuthContext.jsx     # Authentication state management
├── hooks/                  # Custom React hooks
│   ├── useApi.js           # Data fetching hook
│   └── useLocalStorage.js  # Local storage sync hook
├── pages/                  # Route-level page components
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Trending.jsx
│   ├── Products.jsx
│   ├── Availability.jsx
│   ├── Chat.jsx
│   ├── Profile.jsx
│   └── Insights.jsx
├── utils/                  # Utility functions
│   ├── constants.js        # App constants (routes, categories)
│   ├── formatters.js       # Date, currency formatters
│   └── helpers.js          # Helper functions (classNames, debounce)
├── App.jsx                 # Root component with routing
├── main.jsx                # Entry point
└── styles.css              # Tailwind CSS imports + custom styles
```

## Technology Stack

- **Framework**: React 18 with hooks
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v3
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite

## Key Features

### 1. Modular Component Architecture
- **Atomic Design**: Components organized from primitives to complex compositions
- **Separation of Concerns**: UI components separated from business logic
- **Reusability**: Common components are fully reusable with props-based configuration

### 2. State Management
- **AuthContext**: Centralized authentication state with login/register/logout
- **useApi Hook**: Reusable data fetching with loading/error states
- **useLocalStorage Hook**: Syncs state with localStorage for persistence

### 3. API Integration
- **Centralized Client**: All API calls go through `/api/client.js`
- **Interceptor Pattern**: Automatic JWT attachment and error handling
- **Gateway-Only**: All requests route through `api-gateway:8000` (never Central API)

### 4. Route Structure (P17 Requirements)
| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | JWT-based authentication |
| `/register` | Register | User registration |
| `/products` | Products | Paginated listing with category filter |
| `/availability` | Availability | Product availability checker |
| `/chat` | Chat | AI assistant with session management |
| `/profile` | Profile | User discount lookup |
| `/insights` | Insights | Analytics dashboard |
| `/trending` | Trending | Today's recommendations (P18) |

### 5. Chat Features (P15, P16)
- Session sidebar with auto-generated names
- Message history persistence via MongoDB
- Real-time message bubbles (user right, assistant left)
- Loading states with typing indicator

### 6. UI/UX Enhancements
- Loading skeletons on all data-dependent views
- Error handling with user-friendly messages
- Responsive design (mobile-first)
- Custom scrollbars
- Smooth animations and transitions

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000  # API Gateway URL
```

## Docker

The frontend is containerized with a multi-stage build:
1. **Builder stage**: Node.js Alpine builds the app
2. **Runtime stage**: BusyBox serves static files via httpd

Target image size: < 50MB (P19 requirement)

## Code Quality Principles

1. **Single Responsibility**: Each file does one thing well
2. **DRY (Don't Repeat Yourself)**: Reusable components and hooks
3. **KISS (Keep It Simple)**: Minimal abstractions, clear code
4. **Type Safety**: Prop validation via default patterns
5. **Accessibility**: Semantic HTML and ARIA labels where needed

## API Gateway Integration

All API calls follow the pattern:
```javascript
import { api } from '../api/client.js';

// GET request
const data = await api.get('/rentals/products', { page: 1, limit: 12 });

// POST request
const result = await api.post('/users/login', { email, password });
```

**Important**: The frontend never calls the Central API directly. All requests go through the API Gateway at port 8000.
