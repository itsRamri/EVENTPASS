# 🎟️ EventPass — Event Management, Digital Passes & Live Gate Scanner

> A modern, high-performance Event Management, Digital Ticketing, and QR Gate Check-in ecosystem built with **React 18, TypeScript, Vite, Firebase Firestore, and Capacitor Android**.

---

## 📖 Complete Documentation

For the full detailed explanation of all functions, views, components, services, database schemas, and workflows, please see:
👉 **[DOCUMENTATION.md](./DOCUMENTATION.md)**

---

## ⚡ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Android Studio](https://developer.android.com/studio) (for building native Android APK)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Web App Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Android APK
Run the automated build script:
```powershell
.\build-apk.bat
```
Or manually run:
```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 🌟 Core Highlights

- 👔 **Manager Portal**: 4-step event creation wizard, dynamic registration form builder, multi-token pass allocation (e.g. 1 to 15+ tokens per ticket), attendee approvals, and CSV export.
- 🛡️ **Gate Scanner**: High-speed camera QR code scanner powered by `jsQR` with live audio chimes/buzzers, multi-token deduction counters, flashlight toggle, and manual verification.
- 🎟️ **Attendee Wallet**: Event catalog, dynamic registration forms with mandatory live selfie camera capture, and digital pass wallet with dynamic QR codes.
- 👥 **Role-Based Access Control**: Fast role switching between **Manager/Organizer**, **Gate Scanner/Staff**, and **Guest/Attendee**.
- ☁️ **Firebase Backend**: Real-time Firestore sync with local cache fallback and Cloud Storage for photos & documents.

---

## 📂 Project Architecture

```
Event pass/
├── src/
│   ├── components/     # Reusable UI components (Navbar, Sidebar, Pass Modal, Live Camera)
│   ├── context/        # Global state management (AppContext.tsx)
│   ├── services/       # Firebase Auth & Firestore DB service layer
│   ├── types/          # TypeScript definitions & interfaces
│   ├── utils/          # Web Audio synthesizer, image compressor, QR generator
│   ├── views/          # Application views & screen layouts
│   └── App.tsx         # Main router and shell layout
├── css/                # Custom Glassmorphism design system and responsive styles
├── android/            # Native Android Capacitor bridge
└── DOCUMENTATION.md    # In-depth system and function manual
```

---

*See [DOCUMENTATION.md](./DOCUMENTATION.md) for the complete reference manual.*
