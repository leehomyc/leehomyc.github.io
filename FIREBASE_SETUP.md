# Firebase Setup Guide

## 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it (e.g., "TrendingPapers") and continue.
4. Disable Google Analytics (optional, for simplicity) and click **"Create project"**.

## 2. Register Your App
1. On the project overview page, click the **Web icon (</>)**.
2. Name the app (e.g., "Web") and click **"Register app"**.
3. **Copy the `firebaseConfig` object** shown (you'll need this for `firebase_auth.js`).
4. Click **"Continue to console"**.

## 3. Enable Authentication
1. Go to **"Build"** > **"Authentication"** in the left sidebar.
2. Click **"Get started"**.
3. Select **"Google"** from the Sign-in method list.
4. Click **"Enable"**.
5. Select a support email and click **"Save"**.

## 4. Enable Firestore Database
1. Go to **"Build"** > **"Firestore Database"**.
2. Click **"Create database"**.
3. Choose a location and click **"Next"**.
4. Choose **"Start in production mode"**.
5. Click **"Create"**.

## 5. Set Firestore Rules
1. Go to the **"Rules"** tab in Firestore.
2. Replace the rules with the following to allow only logged-in users to access their own bookmarks:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
3. Click **"Publish"**.

## 6. Finish
1. Open `firebase_auth.js` in your project.
2. Paste the `firebaseConfig` keys from Step 2.
