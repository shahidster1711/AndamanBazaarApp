
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

## 🗄️ Database Schema

(Existing schema documentation remains unchanged...)
