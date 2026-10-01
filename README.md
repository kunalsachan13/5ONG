# 5ONG 🎵

A state-of-the-art modern music streaming and discovery web platform. Built with **Next.js 16 (App Router + Turbopack)**, **Tailwind CSS**, **Firebase Firestore**, and a resilient **Dual-Engine Audio System** supporting direct 320kbps CDNs and full-length YouTube streaming.

![5ONG Music Platform](https://raw.githubusercontent.com/kunalsachan13/JF-Player/main/public/banner.png)

---

## ✨ Features

- 🎧 **Dual-Engine Audio Playback**:
  - **Primary**: Verified JioSaavn 320kbps / 160kbps CDN direct streams.
  - **Secondary**: Full-length seamless client-side YouTube IFrame player fallback with autoplay and background support.
- 🖼️ **Ultra High-Definition Artwork**: Automatic 600×600 album artwork with graceful fallback designs.
- 📊 **Real-time Global Charts**: Apple iTunes RSS Top 50 Charts and Spotify Today's Top Hits.
- 🔍 **Universal Music Search & Discovery**:
  - Multi-catalog search across global releases.
  - Live query autocomplete suggestions.
  - Smart radio station generation based on song affinity.
- 🎚️ **10-Band Studio Equalizer**:
  - Web Audio API equalizer with real-time spectrum visualizer (Bars, Wave, Orbit, Mirror).
  - Presets: Cozy Warm, Flat, Bass Boost, Treble Boost, Vocal, Acoustic, Electronic, Rock, Pop, Jazz.
- 🔐 **Authentication & Multi-Provider Sign-In**:
  - **Google OAuth**: One-click Google sign-in with client ID and secret pre-configured.
  - **OTP Verification**: Fast 6-digit email sign-in code with demo/dev fallback.
  - **Password Auth**: Secure bcrypt registration and login.
- ☁️ **Firebase Firestore Database**:
  - Real-time cloud persistence for user accounts, playlists, liked tracks, listening history, and synchronized listening rooms.
  - Resilient offline/guest mode with localStorage caching.
- 👥 **Live Listening Rooms**: Host or join synchronized rooms to listen together in real-time with friends.
- ⬇️ **320kbps MP3 Downloader**: Direct track downloader embedding ID3 tags and cover artwork with confetti celebration.
- ⏲️ **Sleep Timer & Speed Control**: 15m to 60m sleep timers and 0.75× to 2.0× playback speed controls.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🌐 Deploy to Netlify

This project is pre-configured with `netlify.toml` and `@netlify/plugin-nextjs`.

1. **Push code to GitHub** (see below).
2. Connect your repository on [Netlify](https://app.netlify.com).
3. Set the build settings:
   - **Base directory**: `.`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
4. Add environment variables in **Netlify Site Settings > Environment variables**:
   - `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret
   - `AUTH_SECRET`: Your production JWT secret key
   - `FIREBASE_PROJECT_ID`: `jf-player-510117`
5. Click **Deploy Site**!

---

## 📄 License
MIT License. Built with ❤️.
