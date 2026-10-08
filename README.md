# 🏙️ CivicLink - Civic Issue Reporting Platform

![CivicLink](https://img.shields.io/badge/status-active-success.svg)
![Firebase](https://img.shields.io/badge/Firebase-Integrated-orange.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

A comprehensive platform empowering citizens to report, track, and resolve civic issues in their community.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase
Create a Firebase project and configure your `.env` file (see `FIREBASE_SETUP.md` for detailed instructions):

```bash
cp .env.example .env
# Then add your Firebase credentials to .env
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Create Admin User
1. Sign up through the app
2. In Firebase Console → Firestore → `users` collection
3. Add field `role: 'admin'` to your user document

## ✨ Features

- 🔐 **Authentication** - Email/password and Google OAuth
- 📸 **Issue Reporting** - Upload photos with GPS location
- 🗺️ **Interactive Map** - Real-time tracking with color-coded markers
- 👨‍💼 **Admin Dashboard** - Manage and update issue statuses
- 📊 **Analytics** - Visual insights with charts and metrics
- 👍 **Community Engagement** - Upvote and comment on issues
- 🎯 **AI-Ready** - Infrastructure for automatic categorization
- 📱 **Responsive** - Works seamlessly on all devices

## 📖 Documentation

- **Firebase Setup**: See `FIREBASE_SETUP.md` for complete Firebase configuration guide
- **Project Details**: Check `README_PROJECT.md` for architecture and tech stack
- **Contributing**: Fork, create a branch, and submit a PR

## 🛠️ Tech Stack

- React 18 + TypeScript
- Firebase (Firestore, Auth, Storage)
- Tailwind CSS + shadcn/ui
- Leaflet for maps
- Recharts for analytics

## Project info

**URL**: https://lovable.dev/projects/07e34c90-dd9c-45f8-ae1b-7730534d2ff6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/07e34c90-dd9c-45f8-ae1b-7730534d2ff6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/07e34c90-dd9c-45f8-ae1b-7730534d2ff6) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
