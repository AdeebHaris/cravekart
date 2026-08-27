# CraveKart - Technical Architecture & Systems Overview

**CraveKart** is a full-stack, enterprise-grade food discovery and ordering web application built with modern technologies, protocols, and security practices: **Server-Sent Events (SSE)**, **Zod Validation**, **Auth0 & JWT Auth**, **Groq AI (Llama 3.3 LLM)**, **Redux Toolkit**, **PostgreSQL**, **i18next**, and **Leaflet Maps**.

---

## 🛠️ Core Technologies & Architectural Stack

| Layer / Concern | Technology / Protocol | Purpose & Implementation |
| :--- | :--- | :--- |
| **Real-time Streaming** | **Server-Sent Events (SSE)** | `@microsoft/fetch-event-source` for real-time live updates from server to client |
| **Input Validation** | **Zod Schema Validation** | Strong runtime schema validation for backend requests (`z.object()`, payload middlewares) |
| **Authentication** | **Auth0 + Dual-Token JWT** | OAuth 2.0/OIDC via `@auth0/auth0-react` + native Access/Refresh Token rotation via `jsonwebtoken` |
| **AI & NLP Inference** | **Groq LLM (Llama 3.3 70B)** | High-throughput AI cloud API for natural language search intent parsing |
| **State Management** | **Redux Toolkit** | Decoupled slice architecture (`cartSlice`, `restaurantSlice`, `menuSlice`) with Async Thunks |
| **Database Tier** | **PostgreSQL (`pg` pool)** | Relational database with connection pooling and parameterized query protection |
| **Internationalization** | **i18next Framework** | Multi-language translation engine with browser language detection (`i18next-browser-languagedetector`) |
| **Maps & Geolocation** | **Leaflet & Google Maps API** | GIS map rendering (`leaflet`, `@googlemaps/js-api-loader`) for restaurant location tracking |
| **Server Framework** | **Express 5 + TypeScript** | Next-generation asynchronous Node.js backend with custom router middlewares |
| **UI Design System** | **TailwindCSS v4 & Lucide** | Utility-first responsive design, dark/light theme tokens, and dynamic styling |

---

## 📡 1. Server-Sent Events (SSE) Protocol

### Purpose & Architecture
Instead of using heavy WebSocket handshakes or inefficient HTTP long-polling, CraveKart uses **Server-Sent Events (SSE)** via `@microsoft/fetch-event-source` to maintain a unidirectional, persistent HTTP stream from the backend server to the client.

### Key Use Cases in CraveKart:
* **Live Order Status Tracking**: Real-time updates pushed from the backend as orders transition through states (*Received* $\rightarrow$ *Preparing* $\rightarrow$ *Out for Delivery* $\rightarrow$ *Delivered*).
* **Live Cart & Price Sync**: Real-time notifications for menu item availability or price updates.

### Technical Implementation:
* **Client**: Uses `fetchEventSource` ([Cart.tsx](file:///e:/Internship/react/craveKart/Frontend/src/Components/Cart.tsx#L6), [Menu.tsx](file:///e:/Internship/react/craveKart/Frontend/src/Components/Menu.tsx#L1)) to listen for SSE streams with automatic reconnection handling.
* **Server**: Configures response headers for streaming:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```

---

## 🛡️ 2. Zod Schema Validation & Middleware Engine

### Purpose
To prevent invalid payloads, malicious inputs, or malformed requests from ever reaching the controller or database layer, CraveKart uses **Zod** (`z.object()`) for strict runtime type-checking.

### Technical Implementation:
* **Schema Definitions**: Schemas created in `Backend/src/validation/schemas/` (e.g., `auth.ts`, `profile.ts`).
* **Validation Middleware**: A generic middleware (`payloadValidation.ts`) intercepts incoming HTTP requests:
  ```typescript
  import { ZodType, ZodError } from 'zod';

  export const validateBody = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body); // Validates and strips unknown fields
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errors: err.errors });
      }
    }
  };
  ```

---

## 🔐 3. Hybrid Authentication: Auth0 & Dual-Token JWT

CraveKart supports a flexible, enterprise-grade authentication system combining third-party Social Logins with native JWT tokens.

```
                  ┌───────────────────────────────┐
                  │    User Login Trigger         │
                  └───────────────┬───────────────┘
                                  │
                   Which Auth Method Selected?
                  ┌───────────────┴───────────────┐
                  │                               │
        ┌─────────▼─────────┐           ┌─────────▼─────────┐
        │  Auth0 OAuth 2.0  │           │   Native Backend  │
        │  (Google/Social)  │           │   (Email + Pass)  │
        └─────────┬─────────┘           └─────────┬─────────┘
                  │                               │
       OAuth Authorization Code          Bcrypt Password Verify
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                   ┌──────────────────────────────┐
                   │ Access Token  (Short-Lived)  │
                   │ Refresh Token (Long-Lived)   │
                   └──────────────────────────────┘
```

### 1. Auth0 Provider Integration
* Integrated via `@auth0/auth0-react` (`Auth0ProviderWithNavigate.tsx`).
* Supports universal login redirect flow, social logins (Google, GitHub), and secure ID Token management.

### 2. Native Dual-Token JWT Strategy (`jsonwebtoken` & `bcrypt`)
* **Access Tokens**: Short-lived JWTs (e.g., 15 minutes) signed with `ACCESS_TOKEN_SECRET` for authenticating API requests in authorization headers (`Authorization: Bearer <token>`).
* **Refresh Tokens**: Long-lived JWTs signed with `REFRESH_TOKEN_SECRET` for renewing expired Access Tokens without requiring the user to log in again.
* **Password Hashing**: `bcrypt` / `bcryptjs` with salt rounds to ensure zero plain-text password storage in PostgreSQL.

---

## 🤖 4. Groq Cloud AI Engine (Llama 3.3 70B LLM)

### Purpose & Capabilities
CraveKart integrates the **Groq API** (`llama-3.3-70b-versatile`) to provide conversational, intent-based natural language search.

### Key Capabilities:
* **Natural Language Intent Extraction**: Converts queries like *"spicy veg noodles under 250 rs"* into structured search objects:
  ```json
  {
    "isValidQuery": true,
    "keywords": ["noodles", "spicy"],
    "veg": true,
    "maxPrice": 250,
    "restaurantName": null,
    "summary": "Showing spicy veg noodles under ₹250"
  }
  ```
* **Regex Hybrid Pre-Filtering**: Runs local Regex filters first (`/^(.)\1{4,}$/i`, vowel-less check, negated character class `[^a-zA-Z0-9]`) to block gibberish queries locally before hitting the Groq API.
* **JSON Output Sanitization**: Strips markdown code blocks (`text.replace(/```json|```/g, '')`) before calling `JSON.parse()`.

---

## 📦 5. Redux Toolkit Architecture & Async Thunks

### State Architecture
Global state is managed via **Redux Toolkit** (`@reduxjs/toolkit`) split into domain slices:

1. **`restaurantSlice`**: Manages master restaurant lists, loading states, search query filters, and error boundaries.
2. **`menuSlice`**: Handles restaurant menu item fetching, category filters, and active dish selections.
3. **`cartSlice`**: Tracks shopping cart items, quantities, subtotal calculations, tax/delivery fees, and checkout state.

### Key Features:
* **Redux Async Thunks (`createAsyncThunk`)**: Encapsulates async backend HTTP calls (`loadRestaurants`, `fetchMenu`) with automated `pending`, `fulfilled`, and `rejected` state transitions.
* **Typed Hooks**: Custom wrapper hooks `useAppSelector` and `useAppDispatch` ensure type-safe Redux state access throughout the React component tree.
* **Immer.js Integration**: Enables intuitive, mutable-style draft updates while maintaining immutable state guarantees under the hood.

---

## 🌐 6. i18next Framework (Internationalization)

* **Multi-Language Support**: Configured via `i18next`, `react-i18next`, and `i18next-browser-languagedetector`.
* **Automatic Language Detection**: Detects user browser locale settings automatically.
* **Translation Tokens**: Components use `useTranslation()` hook (e.g., `t('Error:')`, `t('Search dishes')`) to render dynamic translated UI strings.

---

## 🗺️ 7. Leaflet & Google Maps GIS Integration

* **Interactive Map Rendering**: Integrated via `leaflet` and `@googlemaps/js-api-loader` in `RestaurantMap.tsx`.
* **Spatial Coordinates**: Maps restaurant latitude and longitude coordinates to interactive pins on screen.

---

## 🗄️ 8. PostgreSQL Database & Connection Pooling (`pg`)

* **Database Engine**: PostgreSQL relational database.
* **Connection Pooling**: Native `pg.Pool` connection pool manager for handling high concurrent HTTP request traffic efficiently.
* **SQL Injection Security**: All database operations use parameterized SQL queries (`$1`, `$2`) to prevent SQL injection vulnerabilities.

---

## 📁 Summary of Technical Stack Dependencies

```json
{
  "Protocols & APIs": ["Server-Sent Events (SSE)", "Groq LLM Cloud API", "OAuth 2.0 / OIDC"],
  "Security & Validation": ["Zod Schema Validation", "JWT (jsonwebtoken)", "Bcrypt Password Hashing"],
  "State & UI": ["Redux Toolkit", "React Router v7", "i18next", "TailwindCSS v4", "Lucide React"],
  "GIS & Maps": ["Leaflet Maps", "Google Maps JS API Loader"],
  "Backend Runtime": ["Express 5", "TypeScript", "PostgreSQL (pg pool)"]
}
```

---
*Created for technical architecture review and evaluation.*
