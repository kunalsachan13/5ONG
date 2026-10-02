import crypto from "crypto";
import type { Track, PlaylistSummary } from "@/lib/types";

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function getTOTP(secretB32: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < secretB32.length; i++) {
    const idx = alphabet.indexOf(secretB32[i].toUpperCase());
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

interface SpotifySession {
  accessToken: string;
  clientToken: string;
  expiresAt: number;
}

let cachedSession: SpotifySession | null = null;

export async function getSpotifySession(): Promise<SpotifySession | null> {
  const now = Date.now();
  if (cachedSession && now < cachedSession.expiresAt - 60_000) {
    return cachedSession;
  }

  try {
    const secRes = await fetch(
      "https://code.thetadev.de/ThetaDev/spotify-secrets/raw/branch/main/secrets/secretDict.json",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!secRes.ok) return null;
    const secrets = await secRes.json();
    const version = Math.max(...Object.keys(secrets).map(Number));
    const secretBytes: number[] = secrets[version];
    const transformed = secretBytes.map((e, t) => e ^ ((t % 33) + 9));
    const hexStr = Buffer.from(transformed.join(""), "utf8").toString("hex");
    const b32Secret = base32Encode(Buffer.from(hexStr, "hex"));
    const totp = getTOTP(b32Secret);

    const tokenUrl = `https://open.spotify.com/api/token?reason=init&productType=web-player&totp=${totp}&totpVer=${version}&totpServer=${totp}`;
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!tokenRes.ok) return null;
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.accessToken;
    const clientId = tokenJson.clientId;
    if (!accessToken) return null;

    const ctRes = await fetch("https://clienttoken.spotify.com/v1/clienttoken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_data: {
          client_version: "1.2.45.454.gc5b2b2b2",
          client_id: clientId,
          js_sdk_data: {
            device_brand: "unknown",
            device_model: "unknown",
            os: "windows",
            os_version: "NT 10.0",
            device_id: "d1",
            device_type: "computer",
          },
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!ctRes.ok) return null;
    const ctJson = await ctRes.json();
    const clientToken = ctJson.granted_token?.token || "";

    cachedSession = {
      accessToken,
      clientToken,
      expiresAt: Number(tokenJson.accessTokenExpirationTimestampMs) || now + 3600_000,
    };
    return cachedSession;
  } catch {
    return null;
  }
}

const SEARCH_DESKTOP_HASH = "eef7cc54888d91bdd6802623477873caa3948ae173a0c34fd86827b267e94c03";
const FETCH_PLAYLIST_HASH = "8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a";

export async function searchSpotify(
  query: string,
  limit = 15
): Promise<{ tracks: Track[]; playlists: PlaylistSummary[] }> {
  const session = await getSpotifySession();
  if (!session) return { tracks: [], playlists: [] };

  try {
    const params = new URLSearchParams({
      operationName: "searchDesktop",
      variables: JSON.stringify({
        searchTerm: query,
        offset: 0,
        limit,
        numberOfTopResults: 5,
        includeAudiobooks: false,
        includeArtistHasConcertsField: false,
        includePreReleases: false,
        includeLocalConcertsField: false,
      }),
      extensions: JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: SEARCH_DESKTOP_HASH,
        },
      }),
    });

    const res = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Client-Token": session.clientToken,
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { tracks: [], playlists: [] };

    const json = await res.json();
    const searchV2 = json.data?.searchV2;

    // 1. Playlists
    const rawPlaylists: any[] = searchV2?.playlists?.items || [];
    const playlists: PlaylistSummary[] = rawPlaylists
      .map((item: any) => {
        const d = item.data;
        if (!d || !d.name) return null;
        const uri = d.uri || "";
        const id = uri.split(":").pop() || "";
        if (!id) return null;
        const cover = d.images?.items?.[0]?.sources?.[0]?.url || "";
        return {
          id: `spotify_${id}`,
          name: d.name,
          count: 0,
          covers: cover ? [cover] : [],
          source: "Spotify",
        };
      })
      .filter(Boolean) as PlaylistSummary[];

    // 2. Tracks
    const rawTracks: any[] = searchV2?.tracksV2?.items || [];
    const tracks: Track[] = rawTracks
      .map((it: any) => {
        const d = it.item?.data;
        if (!d || !d.name) return null;
        const uri = d.uri || "";
        const id = uri.split(":").pop() || "";
        const title = d.name;
        const artist = d.artists?.items?.map((a: any) => a.profile?.name).join(", ") || "Unknown";
        const cover = d.albumOfTrack?.coverArt?.sources?.[0]?.url || "";
        const duration = Math.round((d.trackDuration?.totalMilliseconds || 180000) / 1000);
        return {
          id: `sp_${id}`,
          title,
          artist,
          album: d.albumOfTrack?.name,
          cover,
          coverBig: cover,
          duration,
          source: "spotify",
        };
      })
      .filter(Boolean) as Track[];

    return { tracks, playlists };
  } catch {
    return { tracks: [], playlists: [] };
  }
}

export async function getSpotifyPlaylist(
  playlistId: string,
  limit = 100
): Promise<{
  name: string;
  cover: string;
  totalCount: number;
  tracks: Track[];
} | null> {
  const session = await getSpotifySession();
  if (!session) return null;

  const cleanId = playlistId.replace("spotify_", "").replace("sp_", "");

  try {
    const params = new URLSearchParams({
      operationName: "fetchPlaylist",
      variables: JSON.stringify({
        uri: `spotify:playlist:${cleanId}`,
        offset: 0,
        limit,
        enableWatchFeedEntrypoint: false,
      }),
      extensions: JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: FETCH_PLAYLIST_HASH,
        },
      }),
    });

    const res = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Client-Token": session.clientToken,
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const plV2 = json.data?.playlistV2;
    if (!plV2) return null;

    const name = plV2.name || "Spotify Playlist";
    const cover = plV2.images?.items?.[0]?.sources?.[0]?.url || "";
    const content = plV2.content;
    const totalCount = content?.totalCount || 0;
    const rawItems: any[] = content?.items || [];

    const tracks: Track[] = rawItems
      .map((it: any) => {
        const t = it.itemV2?.data;
        if (!t || !t.name) return null;
        const uri = t.uri || "";
        const id = uri.split(":").pop() || "";
        const title = t.name;
        const artist = t.artists?.items?.map((a: any) => a.profile?.name).join(", ") || "Unknown";
        const trackCover = t.albumOfTrack?.coverArt?.sources?.[0]?.url || cover;
        const duration = Math.round((t.trackDuration?.totalMilliseconds || 180000) / 1000);
        return {
          id: `sp_${id}`,
          title,
          artist,
          album: t.albumOfTrack?.name,
          cover: trackCover,
          coverBig: trackCover,
          duration,
          source: "spotify",
        };
      })
      .filter(Boolean) as Track[];

    return { name, cover, totalCount, tracks };
  } catch {
    return null;
  }
}
