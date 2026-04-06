# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure backend URL (optional)

   Create a `.env.local` file in the mobile directory:

   ```bash
   EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```

   If not set, defaults to `http://localhost:8000`.

3. Ensure backend is running

   ```bash
   cd backend && python manage.py runserver
   ```

4. Start the app

   ```bash
   npx expo start
   ```

   In the output, you'll find options to open the app in a:
   - [development build](https://docs.expo.dev/develop/development-builds/introduction/)
   - [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go) - limited sandbox

## Authentication

The mobile app uses JWT token-based authentication with secure storage:

- **Login Screen** (`app/login.tsx`): Enter email and password to authenticate
- **Token Storage** (`lib/auth/storage.ts`): Tokens stored securely using `expo-secure-store`
- **Auth State** (`lib/auth/store.ts`): Zustand store manages auth state across the app
- **Protected Routes**: Only authenticated users can access the dashboard tabs
- **Logout**: Available in Settings screen (`app/settings.tsx`)

### Auth Flow

1. User opens app → checks secure storage for existing session
2. If authenticated, shows Dashboard tabs
3. If not authenticated, shows Login screen
4. User enters email/password → POST `/api/auth/login/`
5. Backend returns tokens (access_token, refresh_token, user profile)
6. App stores tokens securely and updates auth state
7. All subsequent queries use the auth token from store
8. User can logout anytime from Settings

### Testing Login

Use backend test credentials (create via Django admin):

```bash
Email: testuser@example.com
Password: TestPassword123!
```

Or register a new account from the login screen if registration is enabled.

## Backend Data Requirements

For the dashboard to show real data, create the following via Django admin or seed script:

- **User Profile**: Create profile with expertise fields
- **Availability Slots**: Add time slots for mentorship
- **Mentorship Requests**: Create requests to show in dashboard

See `/scripts/seed_data.py` if available for automated setup.

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx        # Root layout with auth initialization
│   ├── login.tsx          # Login screen
│   ├── settings.tsx       # Settings with logout
│   └── (tabs)/            # Authenticated dashboard routes
├── lib/
│   ├── api/               # HTTP client and config
│   ├── auth/              # Auth store, storage, types
│   ├── queries/           # React Query hooks
│   └── ...
├── components/            # React Native components
├── constants/             # Mock data, theme
└── hooks/                 # Custom hooks
```

## Environment Variables

- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL (default: http://localhost:8000)

Note: `EXPO_PUBLIC_ENABLE_MOCK_FALLBACK` is deprecated. Use backend data or add mock fallback in specific queries.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
