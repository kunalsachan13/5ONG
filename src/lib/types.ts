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
  email?: string | null;
  username: string;
  phoneNumber?: string | null;
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

export interface RoomMember {
  userId: string | number;
  name: string;
  avatarUrl?: string | null;
}

export interface RoomChatMessage {
  id: string;
  userId: string | number;
  userName: string;
  userAvatar?: string | null;
  text: string;
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  hostId: number;
  hostName: string;
  isHost: boolean;
  members: RoomMember[];
  messages?: RoomChatMessage[];
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
