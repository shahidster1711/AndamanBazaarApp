# 🚀 AndamanBazaar Deployment Guide

Follow these steps to migrate your project to Firebase Hosting and generate a native Android app.

## 🌐 1. Firebase Hosting Migration

Firebase Hosting is used for the web version of the marketplace.

### Prerequisites
- Install Firebase CLI: `npm install -g firebase-tools`
- Create a project in the [Firebase Console](https://console.firebase.google.com/)

### Step-by-Step
1.  **Login to Firebase**:
    ```bash
    firebase login
    ```
2.  **Initialize Hosting**:
    ```bash
    firebase init hosting
    ```
    - Select your project.
    - What do you want to use as your public directory? **dist**
    - Configure as a single-page app? **Yes**
    - Set up automatic builds and deploys with GitHub? **Yes (Optional)**
    - Overwrite index.html? **No**
3.  **Deploy to Web**:
    ```bash
    npm run firebase-deploy
    ```

---

## 🤖 2. Android App Build (Capacitor)

Capacitor turns your web app into a native Android application.

### Prerequisites
- Install **Android Studio**.
- Ensure **Java 17+** is installed.

### Step-by-Step
1.  **Initialize Capacitor** (Already done in config, but run if missing):
    ```bash
    npx cap init
    ```
2.  **Add Android Platform**:
    ```bash
    npx cap add android
    ```
3.  **Build and Sync**:
    Every time you change the code, run:
    ```bash
    npm run build
    npx cap sync
    ```
4.  **Open in Android Studio**:
    ```bash
    npx cap open android
    ```
5.  **Generate APK**:
    - In Android Studio, wait for Gradle sync to finish.
    - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    - The APK will be generated in `android/app/build/outputs/apk/debug/`.

---

## 🔒 3. Supabase Configuration (Native)

When running on Android, ensure your Supabase URL and Anon Key are correctly set in your environment variables. 

- **Redirect URL**: Add `com.andamanbazaar.app://` to your Supabase Auth Redirect URLs in the Supabase Dashboard if you use OAuth.

## 🛠️ Permissions Checklist
The app is pre-configured to request:
- `CAMERA`: For taking product photos.
- `ACCESS_FINE_LOCATION`: For island verification.

These are defined in `metadata.json` and automatically handled by the `@capacitor/camera` and `@capacitor/geolocation` plugins during the `npx cap sync` process.
