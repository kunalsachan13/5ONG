/**
 * Firebase Firestore Database Adapter for 5ONG
 * Provides real-time, scalable NoSQL persistence for Users, Playlists, Likes, History, OTPs, and Rooms.
 */
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, type Firestore } from 'firebase-admin/firestore';

declare global {
  var __firebaseAdminApp: App | undefined;
  var __firebaseMemoryStore: {
    users: Map<string | number, any>;
    playlists: Map<string | number, any>;
    playlistTracks: Map<string | number, any[]>;
    likes: Map<string | number, any[]>;
    history: Map<string | number, any[]>;
    otps: Map<string, any>;
    rooms: Map<string, any>;
  } | undefined;
}

const memoryStore = (globalThis.__firebaseMemoryStore = globalThis.__firebaseMemoryStore || {
  users: new Map(),
  playlists: new Map(),
  playlistTracks: new Map(),
  likes: new Map(),
  history: new Map(),
  otps: new Map(),
  rooms: new Map(),
});

function initFirebaseAdmin(): App | null {
  if (globalThis.__firebaseAdminApp) return globalThis.__firebaseAdminApp;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'jf-player-510117';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // Only initialize Admin SDK if explicit credentials or Google credentials environment variable exists
  const hasExplicitCredentials = Boolean(
    (clientEmail && privateKey) || process.env.GOOGLE_APPLICATION_CREDENTIALS
  );

  if (!hasExplicitCredentials) {
    // Return null so the app uses the fast local persistent memory store without throwing "Could not load default credentials"
    return null;
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      globalThis.__firebaseAdminApp = existingApps[0]!;
      return globalThis.__firebaseAdminApp;
    }

    if (clientEmail && privateKey) {
      globalThis.__firebaseAdminApp = initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        },
        '5ong-admin',
      );
      return globalThis.__firebaseAdminApp;
    }

    globalThis.__firebaseAdminApp = initializeApp(
      {
        projectId,
      },
      '5ong-admin',
    );
    return globalThis.__firebaseAdminApp;
  } catch (err) {
    console.warn('[Firebase] Admin initialization note (using resilient fallback store):', err);
    return null;
  }
}

export function getFirestore(): Firestore | null {
  const app = initFirebaseAdmin();
  if (!app) return null;
  try {
    return getAdminFirestore(app);
  } catch (err) {
    console.warn('[Firebase] Firestore unavailable, using in-memory store:', err);
    return null;
  }
}

export const firebaseDb = {
  // ---------------- Users ----------------
  async getUserByEmail(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const db = getFirestore();
    if (db) {
      try {
        const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      } catch (e) {
        console.warn('[Firebase] getUserByEmail error:', e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.email === cleanEmail) return u;
    }
    return null;
  },

  async getUserByGoogleId(googleId: string) {
    const db = getFirestore();
    if (db) {
      try {
        const snap = await db.collection('users').where('googleId', '==', googleId).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      } catch (e) {
        console.warn('[Firebase] getUserByGoogleId error:', e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.googleId === googleId) return u;
    }
    return null;
  },

  async getUserById(id: string | number) {
    const sId = String(id);
    const db = getFirestore();
    if (db) {
      try {
        const doc = await db.collection('users').doc(sId).get();
        if (doc.exists) return { id: doc.id, ...doc.data() };
      } catch (e) {
        console.warn('[Firebase] getUserById error:', e);
      }
    }
    return memoryStore.users.get(sId) || memoryStore.users.get(Number(id)) || null;
  },

  async createUser(data: { email: string; username: string; passwordHash?: string | null; googleId?: string | null; avatarUrl?: string | null }) {
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanUsername = data.username.trim();
    const db = getFirestore();
    const payload = {
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: data.passwordHash || null,
      googleId: data.googleId || null,
      avatarUrl: data.avatarUrl || null,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        const ref = await db.collection('users').add(payload);
        const user = { id: ref.id, ...payload };
        memoryStore.users.set(ref.id, user);
        return user;
      } catch (e) {
        console.warn('[Firebase] createUser error, falling back to memory:', e);
      }
    }

    const id = Date.now().toString();
    const user = { id, ...payload };
    memoryStore.users.set(id, user);
    return user;
  },

  async updateUser(id: string | number, data: Partial<{ email: string; username: string; passwordHash: string; googleId: string; avatarUrl: string }>) {
    const sId = String(id);
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('users').doc(sId).set(data, { merge: true });
      } catch (e) {
        console.warn('[Firebase] updateUser error:', e);
      }
    }
    const cur = memoryStore.users.get(sId) || {};
    const updated = { ...cur, ...data, id: sId };
    memoryStore.users.set(sId, updated);
    return updated;
  },

  // ---------------- Likes ----------------
  async getLikes(userId: string | number) {
    const sId = String(userId);
    const db = getFirestore();
    if (db) {
      try {
        const snap = await db.collection('users').doc(sId).collection('likes').orderBy('createdAt', 'desc').get();
        return snap.docs.map((d: any) => d.data()?.track).filter(Boolean);
      } catch (e) {
        console.warn('[Firebase] getLikes error:', e);
      }
    }
    return memoryStore.likes.get(sId) || [];
  },

  async saveLike(userId: string | number, track: any) {
    const sId = String(userId);
    const trackId = String(track.id);
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('users').doc(sId).collection('likes').doc(trackId).set({
          trackId,
          track,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Firebase] saveLike error:', e);
      }
    }
    const current = memoryStore.likes.get(sId) || [];
    if (!current.some((t: any) => String(t.id) === trackId)) {
      memoryStore.likes.set(sId, [track, ...current]);
    }
  },

  async removeLike(userId: string | number, trackId: string | number) {
    const sId = String(userId);
    const sTrackId = String(trackId);
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('users').doc(sId).collection('likes').doc(sTrackId).delete();
      } catch (e) {
        console.warn('[Firebase] removeLike error:', e);
      }
    }
    const current = memoryStore.likes.get(sId) || [];
    memoryStore.likes.set(sId, current.filter((t: any) => String(t.id) !== sTrackId));
  },

  // ---------------- Playlists ----------------
  async getPlaylists(userId: string | number) {
    const sId = String(userId);
    const db = getFirestore();
    if (db) {
      try {
        const snap = await db.collection('users').doc(sId).collection('playlists').orderBy('createdAt', 'desc').get();
        const playlists = [];
        for (const doc of snap.docs) {
          const p = doc.data();
          const tracksSnap = await doc.ref.collection('tracks').orderBy('position', 'asc').limit(4).get();
          const covers = tracksSnap.docs.map((t: any) => t.data()?.track?.cover).filter(Boolean);
          playlists.push({
            id: doc.id,
            name: p.name,
            count: p.count || tracksSnap.size,
            covers,
            isPublic: p.isPublic ?? false,
          });
        }
        return playlists;
      } catch (e) {
        console.warn('[Firebase] getPlaylists error:', e);
      }
    }
    return (memoryStore.playlists.get(sId) || []).map((p: any) => {
      const tracks = memoryStore.playlistTracks.get(p.id) || [];
      return {
        id: p.id,
        name: p.name,
        count: tracks.length,
        covers: tracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
        isPublic: p.isPublic ?? false,
      };
    });
  },

  async createPlaylist(userId: string | number, name: string, initialTracks: any[] = []) {
    const sId = String(userId);
    const cleanName = name.trim();
    const db = getFirestore();
    const now = new Date().toISOString();

    if (db) {
      try {
        const ref = await db.collection('users').doc(sId).collection('playlists').add({
          name: cleanName,
          count: initialTracks.length,
          isPublic: false,
          createdAt: now,
        });

        for (let i = 0; i < initialTracks.length; i++) {
          await ref.collection('tracks').add({
            position: i,
            track: initialTracks[i],
            addedAt: now,
          });
        }

        return {
          id: ref.id,
          name: cleanName,
          count: initialTracks.length,
          covers: initialTracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
        };
      } catch (e) {
        console.warn('[Firebase] createPlaylist error:', e);
      }
    }

    const id = Date.now().toString();
    const pl = { id, name: cleanName, isPublic: false, createdAt: now };
    const cur = memoryStore.playlists.get(sId) || [];
    memoryStore.playlists.set(sId, [pl, ...cur]);
    memoryStore.playlistTracks.set(id, initialTracks.slice());

    return {
      id,
      name: cleanName,
      count: initialTracks.length,
      covers: initialTracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
    };
  },

  async getPlaylist(userId: string | number, playlistId: string | number) {
    const sId = String(userId);
    const pId = String(playlistId);
    const db = getFirestore();
    if (db) {
      try {
        const doc = await db.collection('users').doc(sId).collection('playlists').doc(pId).get();
        if (doc.exists) {
          const data = doc.data()!;
          const tracksSnap = await doc.ref.collection('tracks').orderBy('position', 'asc').get();
          const tracks = tracksSnap.docs.map((t: any) => t.data()?.track).filter(Boolean);
          return {
            id: doc.id,
            name: data.name,
            isPublic: data.isPublic ?? false,
            tracks,
          };
        }
      } catch (e) {
        console.warn('[Firebase] getPlaylist error:', e);
      }
    }

    const playlists = memoryStore.playlists.get(sId) || [];
    const pl = playlists.find((p: any) => String(p.id) === pId);
    if (!pl) return null;
    return {
      id: pl.id,
      name: pl.name,
      isPublic: pl.isPublic ?? false,
      tracks: memoryStore.playlistTracks.get(pl.id) || [],
    };
  },

  async addTracksToPlaylist(userId: string | number, playlistId: string | number, tracks: any[]) {
    const sId = String(userId);
    const pId = String(playlistId);
    const db = getFirestore();
    if (db) {
      try {
        const pRef = db.collection('users').doc(sId).collection('playlists').doc(pId);
        const pDoc = await pRef.get();
        const currentCount = pDoc.data()?.count || 0;
        for (let i = 0; i < tracks.length; i++) {
          await pRef.collection('tracks').add({
            position: currentCount + i,
            track: tracks[i],
            addedAt: new Date().toISOString(),
          });
        }
        await pRef.set({ count: currentCount + tracks.length }, { merge: true });
      } catch (e) {
        console.warn('[Firebase] addTracksToPlaylist error:', e);
      }
    }

    const cur = memoryStore.playlistTracks.get(pId) || [];
    memoryStore.playlistTracks.set(pId, [...cur, ...tracks]);
  },

  async removeTrackFromPlaylist(userId: string | number, playlistId: string | number, trackId: string | number) {
    const sId = String(userId);
    const pId = String(playlistId);
    const tId = String(trackId);
    const db = getFirestore();
    if (db) {
      try {
        const tracksRef = db.collection('users').doc(sId).collection('playlists').doc(pId).collection('tracks');
        const snap = await tracksRef.get();
        for (const doc of snap.docs) {
          if (String(doc.data()?.track?.id) === tId) {
            await doc.ref.delete();
            break;
          }
        }
      } catch (e) {
        console.warn('[Firebase] removeTrackFromPlaylist error:', e);
      }
    }

    const cur = memoryStore.playlistTracks.get(pId) || [];
    memoryStore.playlistTracks.set(pId, cur.filter((t: any) => String(t.id) !== tId));
  },

  async deletePlaylist(userId: string | number, playlistId: string | number) {
    const sId = String(userId);
    const pId = String(playlistId);
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('users').doc(sId).collection('playlists').doc(pId).delete();
      } catch (e) {
        console.warn('[Firebase] deletePlaylist error:', e);
      }
    }

    const cur = memoryStore.playlists.get(sId) || [];
    memoryStore.playlists.set(sId, cur.filter((p: any) => String(p.id) !== pId));
    memoryStore.playlistTracks.delete(pId);
  },

  // ---------------- History ----------------
  async getHistory(userId: string | number, limit = 50) {
    const sId = String(userId);
    const db = getFirestore();
    if (db) {
      try {
        const snap = await db.collection('users').doc(sId).collection('history').orderBy('playedAt', 'desc').limit(limit).get();
        return snap.docs.map((d: any) => d.data());
      } catch (e) {
        console.warn('[Firebase] getHistory error:', e);
      }
    }
    return (memoryStore.history.get(sId) || []).slice(0, limit);
  },

  async addHistory(userId: string | number, track: any, playedSeconds = 0) {
    const sId = String(userId);
    const item = {
      track,
      playedSeconds,
      playedAt: new Date().toISOString(),
    };
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('users').doc(sId).collection('history').add(item);
      } catch (e) {
        console.warn('[Firebase] addHistory error:', e);
      }
    }
    const cur = memoryStore.history.get(sId) || [];
    memoryStore.history.set(sId, [item, ...cur.slice(0, 99)]);
  },

  // ---------------- Rooms ----------------
  async getRoom(code: string) {
    const cleanCode = code.toUpperCase().trim();
    const db = getFirestore();
    if (db) {
      try {
        const doc = await db.collection('rooms').doc(cleanCode).get();
        if (doc.exists) return doc.data();
      } catch (e) {
        console.warn('[Firebase] getRoom error:', e);
      }
    }
    return memoryStore.rooms.get(cleanCode) || null;
  },

  async saveRoom(code: string, data: any) {
    const cleanCode = code.toUpperCase().trim();
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('rooms').doc(cleanCode).set(data, { merge: true });
      } catch (e) {
        console.warn('[Firebase] saveRoom error:', e);
      }
    }
    const cur = memoryStore.rooms.get(cleanCode) || {};
    memoryStore.rooms.set(cleanCode, { ...cur, ...data });
  },

  async deleteRoom(code: string) {
    const cleanCode = code.toUpperCase().trim();
    const db = getFirestore();
    if (db) {
      try {
        await db.collection('rooms').doc(cleanCode).delete();
      } catch (e) {
        console.warn('[Firebase] deleteRoom error:', e);
      }
    }
    memoryStore.rooms.delete(cleanCode);
  },
};
