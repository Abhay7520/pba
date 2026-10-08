# Firebase Security Rules

## Important: Apply These Rules in Firebase Console

Go to Firebase Console → Firestore Database → Rules and update with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return exists(/databases/$(database)/documents/user_roles/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/user_roles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User profiles - users can read their own, admins can read all
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User roles - CRITICAL: Only admins can write, users can read their own
    match /user_roles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if isAdmin(); // Only admins can modify roles
    }
    
    // Issues - authenticated users can create, everyone can read
    match /issues/{issueId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       (request.auth.uid == resource.data.userId || isAdmin());
      allow delete: if isAdmin();
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow update, delete: if request.auth != null && 
                                 (request.auth.uid == resource.data.userId || isAdmin());
      }
    }
    
    // Notifications - users can only read/update their own
    match /notifications/{notificationId} {
      allow read, update: if request.auth != null && 
                             request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    // Analytics - only admins can access
    match /analytics/{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

## How to Apply:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy and paste the rules above
5. Click **Publish**

## Security Features:

✅ **Separate Role Storage**: Roles stored in `user_roles` collection, not in user profiles
✅ **Admin-Only Role Modification**: Only admins can change user roles
✅ **Protected Routes**: Client-side protection with ProtectedRoute component
✅ **Server-Side Validation**: Firestore rules validate all operations
✅ **Prevents Privilege Escalation**: Users cannot modify their own roles

## Creating an Admin User:

Since only admins can modify roles, you need to manually create the first admin:

1. Go to Firestore Database in Firebase Console
2. Create a new collection: `user_roles`
3. Add a document with ID = your user's UID
4. Set fields:
   - `userId`: (string) your user's UID
   - `role`: (string) "admin"
   - `createdAt`: (timestamp) current date/time

After creating the first admin, that admin can promote other users through the application.
