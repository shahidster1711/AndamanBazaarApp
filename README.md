
# 🏝️ AndamanBazaar

## The Hyperlocal Marketplace for Andaman & Nicobar Islands

## 🚀 Deployment & App Builds

### 1. Firebase Hosting (Web)

To host the web version on Firebase:

1. **Install Firebase CLI**: `npm install -g firebase-tools`
2. **Login**: `firebase login`
3. **Initialize**: `firebase init hosting` (Select your existing project, use `dist` as public directory, and configure as a single-page app).
4. **Deploy**: `npm run firebase-deploy`

### 2. Android App (Native)

We use **Capacitor** to wrap the React app into a native Android APK/AAB.

1. **Install Android Studio**: Ensure you have the latest Android SDK installed.
2. **Add Android Platform**:

   ```bash
   npx cap add android
   ```

3. **Sync Web Assets**:

   ```bash
   npm run cap-copy
   ```

4. **Open in Android Studio**:

   ```bash
   npm run android-open
   ```

5. **Build APK**: In Android Studio, go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.

## 🛠️ Mobile-Specific Notes

- **Geolocation**: The app is pre-configured to request GPS permissions in `AndroidManifest.xml` (via Capacitor Geolocation plugin). This is critical for the "Island Verified" badge.
- **Camera**: Used for snapping listing photos directly within the app.

## 🔐 Google OAuth (Supabase)

### 1. Google Cloud Console
1. Create an OAuth 2.0 Client ID (Web application).
2. Add authorized JavaScript origins:
   - http://localhost:5173
   - https://your-production-domain
3. Add authorized redirect URIs:
   - https://<your-supabase-project-id>.supabase.co/auth/v1/callback

### 2. Supabase Dashboard
1. Authentication → Providers → Google: enable and paste Client ID + Client Secret.
2. Authentication → URL Configuration:
   - Site URL: http://localhost:5173 (or production URL)
   - Redirect URLs: http://localhost:5173/auth and https://your-production-domain/auth

### 3. App Flow
- The OAuth button uses `redirectTo: <origin>/auth`.
- After the callback, Supabase stores the session and the app redirects to `/`.

## 🗄️ Database Schema

(Existing schema documentation remains unchanged...)
