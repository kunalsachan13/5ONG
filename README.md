# 5ONG 🎵

A state-of-the-art modern music streaming, discovery, and playback platform designed for audiophiles, social listeners, and power users. Built on **Next.js 16 (App Router + Turbopack)**, **React 19**, **Tailwind CSS**, and available across **Web**, **Android (Capacitor)**, and **Desktop (Electron)**.

5ONG combines a high-fidelity **Dual-Engine Audio Architecture** with zero-compromise playback, synchronized social listening rooms, real-time dynamic UI themes, local audio playback, and cross-platform playlist migration.

---

## ✨ Comprehensive Features

### 🎧 Resilient Dual-Engine Audio Architecture
- **Primary Engine**: High-fidelity 320kbps / 160kbps CDN direct streaming (verified JioSaavn audio CDN with ultra-low latency).
- **Secondary Engine**: Seamless client-side YouTube IFrame player fallback with autoplay and uninterrupted background playback for deep-catalog & rare tracks.
- **Smart Stream Resolution**: Automatically selects the purest audio stream with zero interruption or buffering hiccups.

### 🎨 Dynamic Artwork-Adaptive Theming & Visuals
- **Real-Time Color Extraction**: Samples album artwork dynamically to calculate primary, accent, glow, and contrast tokens.
- **Ambient Canvas Reactive Glow**: Immersive backdrop blur and reactive ambient glow matching each song's unique vibe.
- **Studio Audio Visualizer**: Logarithmically balanced frequency spectrum visualizer (Bars, Wave, Orbit, Mirror) rendered at 60 FPS.
- **Ultra-HD Covers**: Automatic 600×600 album artwork with elegant procedural gradient fallbacks.

### 🎤 Synchronized Karaoke Lyrics
- **Time-Synced Lyrics**: Live scrolling karaoke lyrics with timestamp precision and click-to-seek scrub support.
- **Graceful Fallbacks**: Automatically fetches plain un-synced lyrics or artist metadata when timestamps are unavailable.

### 🎚️ 10-Band Studio Equalizer & Audio Controls
- **Parametric Graphic EQ**: Real-time Web Audio API filters covering 32Hz to 16kHz with ±12dB gain control.
- **Preamp Gain**: Dedicated digital preamp boost/cut controls.
- **Audio Presets**: Cozy Warm, Bass Boost, Treble Boost, Vocal, Acoustic, Rock, Pop, Jazz, Electronic, and Flat.
- **Playback Controls**: Variable speed playback (0.75× – 2.0×) and customizable sleep timers (15m – 60m).

### 👥 Live Synchronized Rooms & Real-Time Chat
- **Synchronized Playback**: Host or join live listening rooms where playhead positions, track selection, and queues stay in lockstep.
- **In-Room Live Chat**: Chat with friends in real-time while listening together.
- **Instant Sharing**: One-click room codes and shareable deep links.

### 🔄 Multi-Platform Playlist Importer
- **Universal Playlist Migration**: Import playlists or albums in seconds from:
  - **Spotify**
  - **YouTube / YouTube Music**
  - **JioSaavn**
  - **Amazon Music**
  - **Plain Text / Tracklists**
- **Automated High-Fi Matching**: Automatically maps external tracks to high-bitrate streaming sources.

### 💾 Local Music & Offline Player
- **Local File & Folder Import**: Drag-and-drop local MP3, M4A, FLAC, and WAV files or entire audio folders.
- **Offline IndexedDB Storage**: Parses and stores track metadata, ID3 tags, and embedded artwork for completely offline listening.
- **Universal Library**: Seamlessly mixes local library files with streaming playlists.

### 🧠 Smart Queue & Taste Profile
- **Smart Radio**: Infinite autoplay radio station generation based on song and artist affinity.
- **Smart AI-Inspired Shuffle**: Intelligent reshuffle algorithm that balances genre variety and avoids jarring tempo jumps.

### ⬇️ 320kbps Tagged Downloader
- **Direct MP3 Downloads**: Save 320kbps MP3s locally with embedded ID3 tags (Title, Artist, Album, Year) and high-resolution cover artwork.
- **Celebratory UI**: Delightful in-app canvas confetti animation upon download completion.

### 📱 True Cross-Platform Ecosystem
- **Web App / PWA**: Installable progressive web application with responsive layout for mobile and desktop.
- **Native Android App**: Packaged via **Capacitor** with native hardware back-button handling, status bar theming, and offline persistence.
- **Desktop Application**: Packaged via **Electron** for native Windows, macOS, and Linux support.

### 🔐 Multi-Provider Auth & Flexible Access
- **Google OAuth**: One-click sign-in via Google accounts.
- **Email OTP**: Secure passwordless 6-digit email verification codes.
- **Credential Auth**: Strong bcryptjs password hashing and JWT sessions.
- **Guest / Offline Mode**: 100% usable without registration, with persistent localStorage caching.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router + Turbopack), React 19 |
| **Styling** | Tailwind CSS 4, Lucide Icons, Glassmorphic CSS |
| **Databases** | Firebase Firestore (Realtime pub/sub, rooms, users) & Neon Serverless PostgreSQL (Drizzle ORM) |
| **Audio Processing** | Web Audio API, `node-id3`, custom logarithmic analyser |
| **Mobile & Desktop** | Capacitor 8 (Android) & Electron 44 (Desktop) |
| **Hosting & Edge** | Vercel, Netlify, and Cloudflare Pages / Workers via OpenNext |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- npm or pnpm

### 2. Installation
```bash
git clone https://github.com/your-username/5ONG.git
cd 5ONG
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

### 6. Build Android or Desktop Builds
```bash
# Android (Capacitor)
npx cap sync android
npx cap open android

# Desktop (Electron)
npm run dist-desktop # or electron build commands
```

---

## 📄 License
MIT License. Built with ❤️ for music lovers everywhere.

