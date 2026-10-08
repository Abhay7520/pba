# 🏙️ CivicLink - Civic Issue Reporting Platform

A comprehensive platform for citizens to report, track, and resolve civic issues in their community.

## ✨ Features Implemented

### Phase 1-3: Core Functionality ✅
- **Firebase Integration**: Complete setup with Firestore, Auth, and Storage
- **User Authentication**: Email/password and Google OAuth login
- **Issue Reporting**: Upload photos, auto-detect GPS location, categorize issues
- **Interactive Map**: Real-time map view with color-coded status markers

### Phase 4: AI Categorization 🔄 (Foundation Ready)
- Image upload infrastructure in place
- TensorFlow.js and Teachable Machine dependencies installed
- AI prediction UI prepared
- Ready for custom model integration

### Phase 5-6: Management & Admin ✅
- **Map View**: Leaflet-based interactive map with filtering
- **Status Tracking**: Visual indicators (🔴 Open, 🟡 In Progress, 🟢 Resolved)
- **Admin Dashboard**: Complete management interface for authorized users
- **Role-Based Access**: User and admin role management

### Phase 7: Analytics ✅
- **Dashboard Metrics**: Total issues, resolved, pending, resolution rate
- **Visual Charts**: Bar charts, pie charts, line graphs
- **Category Breakdown**: Issues distribution by category
- **Timeline View**: 30-day trend analysis

### Phase 8-9: Community & Gamification 🔄 (Partially Implemented)
- **Upvote System**: Community voting on issues
- **User Profiles**: Points and badges infrastructure ready
- **Responsive Design**: Mobile-first, fully responsive interface

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- A Google account for Firebase

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd civiclink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Follow the detailed guide in `FIREBASE_SETUP.md`
   - Create a `.env` file based on `.env.example`
   - Add your Firebase configuration

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Create your first admin user**
   - Sign up through the app
   - In Firebase Console, add `role: 'admin'` to your user document

## 📁 Project Structure

```
civiclink/
├── src/
│   ├── assets/           # Images and static assets
│   ├── components/       # Reusable components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── Navbar.tsx   # Navigation component
│   │   └── ProtectedRoute.tsx
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/             # Utilities and configurations
│   │   └── firebase.ts  # Firebase configuration
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Auth.tsx
│   │   ├── ReportIssue.tsx
│   │   ├── MapView.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── Analytics.tsx
│   └── index.css        # Global styles & design system
├── FIREBASE_SETUP.md    # Firebase setup guide
└── .env.example         # Environment variables template
```

## 🎨 Design System

The app uses a carefully crafted design system with:
- **Primary Color**: Blue (#2563eb) - Trust and civic duty
- **Secondary Color**: Green (#22c55e) - Environment and nature
- **Status Colors**: Red (open), Yellow (in progress), Green (resolved)
- **Modern Typography**: Clean, accessible fonts
- **Smooth Animations**: Subtle transitions and hover effects

## 🔒 Security

- Firestore Security Rules for data protection
- Role-based access control (RBAC)
- Client-side input validation with Zod
- Firebase Authentication for secure user management

## 📱 Responsive Design

- Mobile-first approach
- Tablet and desktop optimized
- Accessible navigation
- Touch-friendly interactive elements

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Maps**: Leaflet, React-Leaflet
- **Charts**: Recharts
- **AI**: TensorFlow.js, Teachable Machine (ready for integration)
- **Build Tool**: Vite
- **State Management**: React Query

## 📊 Future Enhancements

### Phase 4 Completion: AI Image Categorization
- Train custom Teachable Machine model
- Integrate real-time predictions
- Display confidence scores

### Phase 9 Completion: Advanced Features
- **Gamification**: Badge system, leaderboards
- **Notifications**: Real-time status updates
- **Comments**: Full comment threads with replies
- **Dark Mode**: Theme toggle
- **Export**: CSV/PDF report generation

### Additional Ideas
- Push notifications via Firebase Cloud Messaging
- SMS notifications for critical updates
- Multi-language support
- Advanced filters and search
- Mobile apps (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your community!

## 🆘 Support

- Check `FIREBASE_SETUP.md` for Firebase setup help
- Review Firebase Console for data and authentication status
- Check browser console for debugging information

## 🎯 Quick Start Checklist

- [ ] Firebase project created
- [ ] Environment variables configured
- [ ] Authentication enabled (Email + Google)
- [ ] Firestore database created
- [ ] Security rules deployed
- [ ] Storage configured
- [ ] First user signed up
- [ ] Admin role assigned
- [ ] Test issue reported
- [ ] Map view working

## 🌟 Acknowledgments

Built with modern web technologies and best practices for civic engagement platforms.

---

**Made with ❤️ for better communities**
