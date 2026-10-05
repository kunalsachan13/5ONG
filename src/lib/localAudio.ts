// Utility for handling local device audio files, IndexedDB caching, ID3 tag extraction, and playback
import type { Track } from "./types";

const DB_NAME = "5ong_local_music_v1";
const STORE_NAME = "songs";
const DB_VERSION = 1;

interface StoredSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  cover: string;
  file: Blob | File;
  fileName: string;
  fileSize: number;
  addedAt: number;
}

// In-memory cache for generated blob URLs to avoid duplicate object URLs
const blobUrlCache = new Map<string, string>();

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Basic pure JS ID3v2 metadata & album art parser
 */
async function parseId3Tags(file: Blob | File): Promise<{
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
}> {
  try {
    // Only inspect the first 256KB of the file for ID3 headers
    const headerBuffer = await file.slice(0, 262144).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    // Check "ID3" magic
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
      return {};
    }

    const versionMajor = bytes[3];
    if (versionMajor < 2 || versionMajor > 4) return {};

    // Tag size (synchsafe integer)
    const tagSize =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);

    const maxPos = Math.min(tagSize + 10, bytes.length);
    let pos = 10;

    let title: string | undefined;
    let artist: string | undefined;
    let album: string | undefined;
    let cover: string | undefined;

    const textDecoderIso = new TextDecoder("latin1");
    const textDecoderUtf8 = new TextDecoder("utf-8");
    const textDecoderUtf16 = new TextDecoder("utf-16");

    function decodeText(data: Uint8Array): string {
      if (data.length <= 1) return "";
      const encoding = data[0];
      const textBytes = data.subarray(1);
      try {
        if (encoding === 0) return textDecoderIso.decode(textBytes).replace(/\0+$/, "").trim();
        if (encoding === 1 || encoding === 2) return textDecoderUtf16.decode(textBytes).replace(/\0+$/, "").trim();
        if (encoding === 3) return textDecoderUtf8.decode(textBytes).replace(/\0+$/, "").trim();
      } catch {
        return textDecoderIso.decode(textBytes).replace(/\0+$/, "").trim();
      }
      return textDecoderIso.decode(textBytes).replace(/\0+$/, "").trim();
    }

    while (pos < maxPos - 10) {
      const frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
      if (/^[A-Z0-9]{4}$/.test(frameId) === false) break;

      let frameSize = 0;
      if (versionMajor === 4) {
        // synchsafe in v2.4
        frameSize =
          ((bytes[pos + 4] & 0x7f) << 21) |
          ((bytes[pos + 5] & 0x7f) << 14) |
          ((bytes[pos + 6] & 0x7f) << 7) |
          (bytes[pos + 7] & 0x7f);
      } else {
        frameSize =
          (bytes[pos + 4] << 24) |
          (bytes[pos + 5] << 16) |
          (bytes[pos + 6] << 8) |
          bytes[pos + 7];
      }

      if (frameSize <= 0 || pos + 10 + frameSize > maxPos) break;

      const frameData = bytes.subarray(pos + 10, pos + 10 + frameSize);

      if (frameId === "TIT2" && !title) {
        title = decodeText(frameData);
      } else if (frameId === "TPE1" && !artist) {
        artist = decodeText(frameData);
      } else if (frameId === "TALB" && !album) {
        album = decodeText(frameData);
      } else if (frameId === "APIC" && !cover) {
        try {
          let p = 1; // skip encoding byte
          // MIME type is null terminated latin1 string
          let mime = "";
          while (p < frameData.length && frameData[p] !== 0) {
            mime += String.fromCharCode(frameData[p]);
            p++;
          }
          p++; // skip null
          p++; // skip picture type (1 byte)
          // skip description (null terminated)
          while (p < frameData.length && frameData[p] !== 0) {
            p++;
          }
          p++; // skip null
          if (p < frameData.length) {
            const imgBytes = frameData.subarray(p);
            const mimeType = mime.includes("/") ? mime : "image/jpeg";
            const imgBlob = new Blob([imgBytes], { type: mimeType });
            cover = URL.createObjectURL(imgBlob);
          }
        } catch {
          // ignore art parse issue
        }
      }

      pos += 10 + frameSize;
    }

    return { title, artist, album, cover };
  } catch {
    return {};
  }
}

/**
 * Smart filename parser when ID3 tags are missing
 */
function parseFilename(fileName: string): { title: string; artist: string } {
  // Strip extension
  let clean = fileName.replace(/\.[a-zA-Z0-9]{2,5}$/, "").trim();
  // Strip leading track numbers like "01 - ", "1.", "02. "
  clean = clean.replace(/^\d+[\s.-]+/, "").trim();

  // If contains " - " e.g. "Artist - Song Title"
  if (clean.includes(" - ")) {
    const parts = clean.split(" - ");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(" - ").trim(),
      };
    }
  }

  // If contains "_"
  if (clean.includes("_")) {
    const parts = clean.split("_");
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim(),
        title: parts.slice(1).join(" ").trim(),
      };
    }
  }

  return {
    title: clean || "Unknown Song",
    artist: "Local Device Audio",
  };
}

/**
 * Measure audio duration via Audio element
 */
function getAudioDuration(blobUrl: string): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(180);
    const audio = new Audio();
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };
    audio.onloadedmetadata = () => {
      cleanup();
      const dur = Math.round(audio.duration || 180);
      resolve(dur > 0 && !isNaN(dur) ? dur : 180);
    };
    audio.onerror = () => {
      cleanup();
      resolve(180);
    };
    audio.src = blobUrl;
  });
}

function generateDefaultCover(title: string): string {
  // SVG gradient cover
  const letter = (title || "M").charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6" />
        <stop offset="50%" stop-color="#ec4899" />
        <stop offset="100%" stop-color="#f97316" />
      </linearGradient>
    </defs>
    <rect width="300" height="300" rx="40" fill="url(#g)" />
    <circle cx="150" cy="150" r="70" fill="rgba(0,0,0,0.25)" />
    <circle cx="150" cy="150" r="25" fill="rgba(255,255,255,0.85)" />
    <text x="150" y="160" font-family="system-ui, sans-serif" font-size="32" font-weight="900" fill="#000" text-anchor="middle" dominant-baseline="middle">${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Automatically inspects the audio file binary structure.
 * If the file is an MP4/M4A/AAC file that was previously downloaded with an ID3 tag prepended to it
 * (which causes "unsupported file format or unable to play"), it strips the unwanted ID3 header
 * and restores the pure MP4 container with 'audio/mp4' MIME type so HTML5 audio can play it flawlessly!
 */
export async function sanitizeAudioBlob(file: Blob | File): Promise<Blob | File> {
  try {
    const head = await file.slice(0, 1024 * 512).arrayBuffer();
    const bytes = new Uint8Array(head);

    // Check if starts with ID3 header: 'I', 'D', '3'
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      // Calculate ID3v2 tag size (synchsafe integer)
      const tagSize =
        ((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f);
      const id3Total = tagSize + 10;

      // Scan starting at id3Total for 'ftyp' atom (MP4 container signature)
      const scanLimit = Math.min(id3Total + 256, bytes.length - 8);
      for (let offset = id3Total; offset < scanLimit; offset++) {
        if (
          bytes[offset + 4] === 0x66 && // 'f'
          bytes[offset + 5] === 0x74 && // 't'
          bytes[offset + 6] === 0x79 && // 'y'
          bytes[offset + 7] === 0x70    // 'p'
        ) {
          // Found 'ftyp'! Slicing off the prepended ID3 tag restores the clean MP4/M4A file
          return file.slice(offset, file.size, "audio/mp4");
        }
      }
    }
  } catch (_) {}
  return file;
}

/**
 * Parse uploaded/selected files, extract ID3 tags, and store them into IndexedDB
 */
export async function parseAndSaveAudioFiles(files: (File | Blob)[], onProgress?: (done: number, total: number) => void): Promise<Track[]> {
  const db = await getDb();
  const tracks: Track[] = [];

  for (let i = 0; i < files.length; i++) {
    const rawFile = files[i];
    const file = await sanitizeAudioBlob(rawFile);
    const fileName = (rawFile as File).name || `Audio_${Date.now()}_${i}.mp3`;
    const fileSize = file.size || 0;
    const lastMod = (rawFile as File).lastModified || Date.now();

    const id = `local_${encodeURIComponent(fileName)}_${fileSize}_${lastMod}`;

    // Extract tags from original file (may have ID3)
    const [id3] = await Promise.all([
      parseId3Tags(rawFile),
    ]);

    // Create temporary object URL from sanitized audio
    const tempUrl = URL.createObjectURL(file);
    blobUrlCache.set(id, tempUrl);

    const duration = await getAudioDuration(tempUrl);

    const fallback = parseFilename(fileName);
    const title = (id3.title || fallback.title || fileName).trim();
    const artist = (id3.artist || fallback.artist || "Local Artist").trim();
    const album = (id3.album || "Local Audio").trim();
    const cover = id3.cover || generateDefaultCover(title);

    const stored: StoredSong = {
      id,
      title,
      artist,
      album,
      duration,
      cover,
      file,
      fileName,
      fileSize,
      addedAt: Date.now(),
    };

    // Save to IndexedDB
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(stored);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    tracks.push({
      id,
      title,
      artist,
      album,
      duration,
      cover,
      coverBig: cover,
      audioUrl: tempUrl,
      streamUrl: tempUrl,
      source: "local",
    });

    if (onProgress) onProgress(i + 1, files.length);
  }

  return tracks;
}

/**
 * Retrieve all stored local tracks from IndexedDB with live blob URLs
 */
export async function getStoredLocalTracks(): Promise<Track[]> {
  try {
    const db = await getDb();
    const records = await new Promise<StoredSong[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const tracks: Track[] = [];
    for (const item of records.sort((a, b) => b.addedAt - a.addedAt)) {
      let liveUrl = blobUrlCache.get(item.id);
      if (!liveUrl) {
        const cleanFile = await sanitizeAudioBlob(item.file);
        liveUrl = URL.createObjectURL(cleanFile);
        blobUrlCache.set(item.id, liveUrl);
      }

      tracks.push({
        id: item.id,
        title: item.title,
        artist: item.artist,
        album: item.album || "Local Audio",
        duration: item.duration,
        cover: item.cover || generateDefaultCover(item.title),
        coverBig: item.cover || generateDefaultCover(item.title),
        audioUrl: liveUrl,
        streamUrl: liveUrl,
        source: "local",
      });
    }
    return tracks;
  } catch (err) {
    console.warn("Could not read local tracks from IndexedDB:", err);
    return [];
  }
}

/**
 * Get or regenerate audio blob URL for a specific local track ID
 */
export async function getLocalTrackAudioUrl(id: string): Promise<string | null> {
  const existing = blobUrlCache.get(id);
  if (existing) return existing;

  try {
    const db = await getDb();
    const record = await new Promise<StoredSong | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (record && record.file) {
      const cleanFile = await sanitizeAudioBlob(record.file);
      const freshUrl = URL.createObjectURL(cleanFile);
      blobUrlCache.set(id, freshUrl);
      return freshUrl;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Delete a local track from IndexedDB
 */
export async function deleteLocalTrack(id: string): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const cached = blobUrlCache.get(id);
    if (cached) {
      try {
        URL.revokeObjectURL(cached);
      } catch {}
      blobUrlCache.delete(id);
    }
  } catch (err) {
    console.warn("Error deleting local track:", err);
  }
}

/**
 * Clear all local tracks
 */
export async function clearAllLocalTracks(): Promise<void> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    for (const url of blobUrlCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    blobUrlCache.clear();
  } catch (err) {
    console.warn("Error clearing local tracks:", err);
  }
}
