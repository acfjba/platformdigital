# Firebase Seed + Login Bundle

This bundle contains everything to:

1. **Seed Firebase Authentication** using Admin SDK.
2. **Seed Firestore** with user documents.
3. **Test login** via an HTML page.

## Files

- `auth_users.json`: User definitions for Authentication.
- `firestore_seed.json`: Document definitions for Firestore.
- `seed.js`: Node.js script to seed both Auth and Firestore.
- `index.html`: Simple login page using Firebase Web SDK.
- `README.md`: This file.

## Usage

### Prerequisites

- Node.js installed.
- `serviceAccountKey.json` downloaded from Firebase Console → Project Settings → Service accounts.

### Authentication & Firestore Seeding

1. Place `serviceAccountKey.json` in this folder.
2. Run:
   ```bash
   npm install firebase-admin
   node seed.js
   ```
3. The script will create users in Authentication and documents in Firestore.

### Testing Login

1. Open `index.html` in a browser.
2. Enter a seeded user’s email and password.
3. Click **Login**.

### Deploying to Firebase Hosting

1. Install Firebase CLI:  
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Initialize hosting in this folder:  
   ```bash
   firebase init hosting
   ```
3. When prompted, set the **public directory** to `.`   
4. Deploy:  
   ```bash
   firebase deploy
   ```

> **Note:** There is no direct link to sync local files to Firebase Studio. Use the Firebase CLI to deploy and manage your project.
