# 🚀 AndamanBazaar Deployment Guide

Follow these steps to migrate your project to Firebase Hosting and generate a native Android app.

## 🌐 1. Firebase Hosting Migration

Firebase Hosting is used for the web version of the marketplace.

### Prerequisites

- Install Firebase CLI: `npm install -g firebase-tools`
- Create a project in the [Firebase Console](https://console.firebase.google.com/)

### Step-by-Step

1. **Login to Firebase**:

    ```bash
    firebase login
    ```

2. **Initialize Hosting**:

    ```bash
    firebase init hosting
    ```

    - Select your project.
    - What do you want to use as your public directory? **dist**
    - Configure as a single-page app? **Yes**
    - Set up automatic builds and deploys with GitHub? **Yes (Optional)**
    - Overwrite index.html? **No**
3. **Deploy to Web**:

    ```bash
    npm run firebase-deploy
    ```

---

## 🛠️ Security Settings

Ensure your Supabase URL and Anon Key are correctly set in your environment variables.
