## Newborn Health Tracking Frontend

Next.js 14 (App Router) client for the Newborn Health Tracking platform. It consumes the FastAPI backend (`http://localhost:8000`) exposed via the provided OpenAPI contract and delivers auth, child management, and growth insights with shadcn/ui and TanStack Query.

### Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui primitives
- TanStack Query v5 for data fetching/caching
- Axios HTTP client with auth interceptor
- React Hook Form + Zod validation
- `@react-oauth/google` for Google sign-in
- `recharts` for responsive growth charts

### Environment Variables

Create a `.env.local` file in `frontend/` (values shown with sensible defaults):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is omitted the Google button renders disabled, but email/password auth remains available.

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. The app automatically redirects between `/login`, `/register`, and `/dashboard` based on stored auth state (localStorage).

### Scripts

| Script        | Description                              |
| ------------- | ---------------------------------------- |
| `npm run dev` | Start the Next.js dev server             |
| `npm run lint`| Run ESLint with the Next.js config       |
| `npm run build` | Create a production build              |
| `npm run start` | Serve the production build             |

### Project Highlights

- `lib/types.ts` mirrors the backend OpenAPI schemas so the UI stays type-safe.
- `lib/api.ts` exposes typed axios helpers with an interceptor that injects the stored bearer token.
- Auth pages implement both Google OAuth and email/password flows with zod-powered validation.
- The dashboard uses shadcn Tabs, Dialogs, Cards, Table, and Toasts plus a `GrowthChart` built on `recharts`.
- State is centralized via `AuthProvider` (localStorage-backed) and TanStack Query for data consistency and optimistic refreshes.
