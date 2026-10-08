# Firebase Setup Guide for CivicLink

This guide will help you set up Firebase for your CivicLink application.

## Prerequisites

- A Google account
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter "CivicLink" as your project name
4. Follow the setup wizard (you can disable Google Analytics if you prefer)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the Web icon (</>) to add a web app
2. Enter "CivicLink Web" as the app nickname
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this!

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root of your project
2. Copy the contents from `.env.example`
3. Replace the placeholder values with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=civiclink-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=civiclink-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=civiclink-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Step 4: Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Enable **Google** authentication
4. For Google auth, follow the additional setup instructions
5. Add authorized domains if deploying (your deployment URL)

## Step 5: Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add security rules)
4. Select a location close to your users
5. Click "Enable"

### Set Up Security Rules

Go to the **Rules** tab and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Issues collection
    match /issues/{issueId} {
      allow read: if true; // Anyone can read issues (including map view)
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null && 
          request.auth.uid == resource.data.userId;
      }
    }
  }
}
```

## Step 6: Set Up Storage

1. In Firebase Console, go to **Storage**
2. Click "Get started"
3. Use the default security rules for now
4. Click "Done"

### Set Up Storage Rules

Go to the **Rules** tab and replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Step 7: Create an Admin User

After signing up your first user:

1. Go to **Firestore Database** > **users** collection
2. Find your user document
3. Add a field: `role` with value `admin`
4. Save

Now you can access the admin dashboard!

## Step 8: Test Your Setup

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start the development server
3. Try signing up and creating a test issue
4. Check Firebase Console to see if data is being saved

## Optional: Firestore Indexes

If you get errors about missing indexes, Firebase will provide a link to auto-generate them. Click the link and wait for the index to build.

## Troubleshooting

### Authentication not working
- Check that your `.env` file is in the project root
- Verify all environment variables are correct
- Make sure Email/Password is enabled in Firebase Console

### Can't upload images
- Check Storage rules are set correctly
- Verify Storage is enabled in Firebase Console

### Permission errors
- Review Firestore security rules
- Check that the user's role is set correctly

### Need help?
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

## Next Steps

Once Firebase is set up:
- Customize the app branding and colors
- Add more issue categories
- Implement the AI image categorization (Phase 4)
- Add gamification features (Phase 9)
- Deploy your app!

## Security Notes

⚠️ **Important**: 
- Never commit your `.env` file to version control
- The `.env.example` file should not contain real credentials
- Firebase config values are safe to expose (they're meant for client-side use)
- Security is enforced through Firestore Security Rules, not by hiding config
