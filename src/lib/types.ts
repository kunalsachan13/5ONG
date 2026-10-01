export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  cover: string;
  coverBig?: string;
  duration: number;
  explicit?: boolean;
  audioUrl?: string;
  streamUrl?: string;
  preview_url?: string | null;
  youtube_url?: string;
  spotify_url?: string;
  source?: string;
}

export interface PublicUser {
  id: string | number;
  email: string;
  username: string;
  avatarUrl: string | null;
}

export interface PlaylistSummary {
  id: number;
  name: string;
  count: number;
  covers: string[];
}

export interface LyricLine {
  t: number;
  text: string;
}

export interface LyricsResult {
  synced: LyricLine[] | null;
  plain: string | null;
  instrumental?: boolean;
}

export interface RoomInfo {
  code: string;
  hostId: number;
  hostName: string;
  isHost: boolean;
  members: { userId: number; name: string }[];
  state: {
    track: Track | null;
    queue: Track[];
    index: number;
    position: number;
    playing: boolean;
    seq: number;
  } | null;
  updatedAt: number;
  serverNow: number;
}
