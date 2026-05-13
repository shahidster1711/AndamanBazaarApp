<h1 align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d9488,100:14b8a6&height=180&section=header&text=AndamanBazaar&fontSize=52&animation=fadeIn&fontAlignY=35" width="100%" />
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/Capacitor-2E57FF?style=flat-square" />
</p>

<p align="center">
  <strong>The Hyperlocal Marketplace for Andaman & Nicobar Islands 🏝️</strong>
</p>

---

## 🌟 Why This Exists

A modern marketplace connecting buyers, sellers, vendors, and travelers across the Andaman Islands. Built for the island community with features that matter locally — from marine equipment to fresh produce.

---

## ✨ Features

### 🛒 Marketplace
- 📦 **Product Listings** — Title, description, price, category, condition, up to 5 images
- 🤖 **AI Descriptions** — Generate product descriptions with Google Gemini API
- 🔍 **Smart Search** — Full-text search with filters (category, price, location, condition)
- 🏷️ **Categories** — Electronics, Furniture, Vehicles, Marine, Produce, Handicrafts, Jobs, Real Estate

### 👤 User Features
- 🔐 **Auth** — Email/password + Google OAuth via Supabase
- 👤 **Profiles** — Name, phone, location, avatar, verification badge
- 💬 **Real-time Chat** — Direct messaging between buyers and sellers
- ❤️ **Wishlist** — Save favorite listings
- ⭐ **Reviews** — Rate and review sellers

### 🛠️ Technical
- 📱 **Mobile-First** — Responsive UI with bottom navigation
- 🌙 **Dark Mode** — Full dark mode support
- 🖼️ **Image Compression** — Client-side optimization before upload
- 🔒 **RLS Security** — Row Level Security on all database operations

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│   React App    │────▶│   Supabase  │────▶│  PostgreSQL  │
│  (Vite + TS)   │     │   (Auth,    │     │   + Storage  │
│                 │     │   Storage,  │     │   + Realtime │
│  Capacitor     │     │   Realtime) │     │              │
│  (Mobile APK)  │     └─────────────┘     └──────────────┘
└─────────────────┘            │
                               ▼
                        ┌─────────────┐
                        │  Gemini    │
                        │  AI API    │
                        └─────────────┘
```

---

## 🚀 Get Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Firebase project (for hosting)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for web
npm run build

# Deploy to Firebase
npm run firebase-deploy
```

### Mobile Build

```bash
# Add Android platform
npx cap add android

# Sync web assets
npm run cap-copy

# Open in Android Studio
npm run android-open
```

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── views/           # Route-level screens
├── lib/             # Supabase client, utilities
├── types/           # TypeScript definitions
└── App.tsx          # Main router
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Shadcn UI |
| Backend | Supabase (Auth, DB, Storage, Realtime) |
| AI | Google Gemini API |
| Mobile | Capacitor 5 |
| Hosting | Firebase Hosting |

---

## 📱 Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

<p align="center">
  <img src="https://komarev.com/ghpvc/?repo=AndamanBazaarApp&label=Clones&color=0d9488&style=flat" />
</p>

<div align="center">
  Built with ❤️ for the Andaman & Nicobar Islands
</div>
