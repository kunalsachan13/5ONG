/**
 * YouTube Audio Player Service for 5ONG (integrated from JF Player)
 * Provides full-length music streaming via the YouTube IFrame API when direct CDN stream is unavailable.
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerCallbacks {
  onPlaying?: () => void;
  onPaused?: () => void;
  onBuffering?: () => void;
  onEnded?: () => void;
  onError?: (err: any) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

class YouTubeAudioService {
  private player: any = null;
  private isApiLoaded = false;
  private isApiReady = false;
  private callbacks: YouTubePlayerCallbacks = {};
  private timeUpdateInterval: any = null;
  private currentVideoId: string | null = null;
  private pendingVideoId: string | null = null;
  private _isPlaying = false;
  private _currentDuration = 0;
  private currentVolume = 0.85;
  private isMuted = false;
  private containerId = 'song-hidden-yt-player-container';
  private targetDivId = 'song-hidden-yt-player';
  private videoIdCache: Map<string, string> = new Map();

  private _wasPlayingBeforeHidden = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('song:player:settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.volume === 'number') this.currentVolume = parsed.volume;
          if (typeof parsed.muted === 'boolean') this.isMuted = parsed.muted;
        }
      } catch (_) {}
      this.initIframeApi();

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this._isPlaying) {
            this._wasPlayingBeforeHidden = true;
          }
        } else {
          this._wasPlayingBeforeHidden = false;
        }
      });
    }
  }

  private initIframeApi() {
    if (this.isApiLoaded || typeof window === 'undefined') return;
    this.isApiLoaded = true;

    if (window.YT && window.YT.Player) {
      this.isApiReady = true;
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      this.isApiReady = true;
      if (prevReady) prevReady();
      if (this.pendingVideoId) {
        const vid = this.pendingVideoId;
        this.pendingVideoId = null;
        this.play(vid);
      }
    };

    if (!document.getElementById('song-yt-iframe-script')) {
      const script = document.createElement('script');
      script.id = 'song-yt-iframe-script';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  }

  private ensureContainer(): HTMLElement {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.style.position = 'fixed';
      container.style.bottom = '0px';
      container.style.right = '0px';
      container.style.width = '160px';
      container.style.height = '160px';
      container.style.overflow = 'hidden';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '1';
      document.body.appendChild(container);
    }

    let target = document.getElementById(this.targetDivId);
    if (!target) {
      target = document.createElement('div');
      target.id = this.targetDivId;
      container.appendChild(target);
    }

    return target;
  }

  private isPlayerReady = false;

  private waitForApi(timeoutMs = 10000): Promise<boolean> {
    if (this.isApiReady && typeof window !== 'undefined' && window.YT && window.YT.Player) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
          clearInterval(interval);
          this.isApiReady = true;
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 80);
    });
  }

  private waitForPlayerReady(timeoutMs = 8000): Promise<boolean> {
    if (this.isPlayerReady && this.player && typeof this.player.loadVideoById === 'function') {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (this.isPlayerReady && this.player && typeof this.player.loadVideoById === 'function') {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 80);
    });
  }

  public setCallbacks(callbacks: YouTubePlayerCallbacks) {
    this.callbacks = callbacks;
  }

  public async resolveVideoId(title: string, artist?: string, knownVideoId?: string): Promise<string | null> {
    if (knownVideoId && knownVideoId.length === 11) {
      return knownVideoId;
    }

    const query = `${title || ''} ${artist || ''}`.trim();
    if (!query) return null;

    const cacheKey = query.toLowerCase();
    if (this.videoIdCache.has(cacheKey)) {
      return this.videoIdCache.get(cacheKey)!;
    }

    // Try local /api/yt-resolve endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`/api/yt-resolve?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.videoId) {
          this.videoIdCache.set(cacheKey, data.videoId);
          return data.videoId;
        }
      }
    } catch (_) {}

    // Fallback: Direct search scraping fallback
    try {
      const searchRes = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official audio')}`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          },
        }
      );
      if (searchRes.ok) {
        const html = await searchRes.text();
        const dataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]);
            const contents =
              data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            const candidates: Array<{ vid: string; title: string; channel: string }> = [];

            for (const section of contents) {
              const items = section.itemSectionRenderer?.contents || [];
              for (const it of items) {
                if (it.videoRenderer && it.videoRenderer.videoId) {
                  candidates.push({
                    vid: it.videoRenderer.videoId,
                    title: it.videoRenderer.title?.runs?.[0]?.text || '',
                    channel: it.videoRenderer.ownerText?.runs?.[0]?.text || '',
                  });
                }
              }
            }

            if (candidates.length > 0) {
              const qWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
              let bestScore = -1;
              let bestVid = candidates[0].vid;

              for (const c of candidates) {
                const titleLower = c.title.toLowerCase();
                const chanLower = c.channel.toLowerCase();
                if (
                  titleLower.includes('10 hour') ||
                  titleLower.includes('reaction') ||
                  titleLower.includes('tutorial')
                ) {
                  continue;
                }
                let score = 0;
                for (const w of qWords) {
                  if (titleLower.includes(w)) score += 3;
                  if (chanLower.includes(w)) score += 2;
                }
                if (titleLower.includes('official audio') || titleLower.includes('audio')) score += 4;
                if (titleLower.includes('official music video') || titleLower.includes('official video')) score += 3;
                if (chanLower.includes('topic') || chanLower.includes('vevo')) score += 3;

                if (score > bestScore) {
                  bestScore = score;
                  bestVid = c.vid;
                }
              }

              this.videoIdCache.set(cacheKey, bestVid);
              return bestVid;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    return null;
  }

  public async play(videoId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    this.initIframeApi();
    this.ensureContainer();

    const apiLoaded = await this.waitForApi();
    if (!apiLoaded) {
      this.pendingVideoId = videoId;
      return false;
    }

    this.currentVideoId = videoId;

    if (!this.player) {
      return new Promise((resolve) => {
        try {
          this.player = new window.YT.Player(this.targetDivId, {
            height: '200',
            width: '200',
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
              origin: typeof window !== 'undefined' ? window.location.origin : undefined,
            },
            events: {
              onReady: (event: any) => {
                this.isPlayerReady = true;
                try {
                  if (this.isMuted) {
                    event.target.mute();
                  } else {
                    event.target.unMute();
                    event.target.setVolume(Math.round(this.currentVolume * 100));
                  }
                  if (this.currentVideoId && this.currentVideoId !== videoId) {
                    event.target.loadVideoById(this.currentVideoId);
                  }
                  event.target.playVideo();
                } catch (_) {}
                this.startTimeTracking();
                resolve(true);
              },
              onStateChange: (event: any) => {
                this.handleStateChange(event.data);
              },
              onError: (event: any) => {
                this._isPlaying = false;
                this.stopTimeTracking();
                if (this.callbacks.onError) this.callbacks.onError(event.data);
                resolve(false);
              },
            },
          });
        } catch (_) {
          resolve(false);
        }
      });
    }

    const ready = await this.waitForPlayerReady();
    if (!ready) return false;

    try {
      if (this.player) {
        if (this.isMuted) {
          if (typeof this.player.mute === 'function') this.player.mute();
        } else {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.setVolume === 'function') {
            this.player.setVolume(Math.round(this.currentVolume * 100));
          }
        }
        this.player.loadVideoById({ videoId });
        if (typeof this.player.playVideo === 'function') this.player.playVideo();
      }
      this.startTimeTracking();
      return true;
    } catch (_) {
      return false;
    }
  }

  public pause() {
    this._wasPlayingBeforeHidden = false;
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch (_) {}
    }
    this._isPlaying = false;
    this.stopTimeTracking();
  }

  public resume() {
    if (this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.playVideo();
        this.startTimeTracking();
      } catch (_) {}
    }
  }

  public stop() {
    this.pause();
    if (this.player && typeof this.player.stopVideo === 'function') {
      try {
        this.player.stopVideo();
      } catch (_) {}
    }
    this.currentVideoId = null;
    this._isPlaying = false;
    this.stopTimeTracking();
  }

  public seekTo(seconds: number) {
    if (this.player && typeof this.player.seekTo === 'function') {
      try {
        this.player.seekTo(seconds, true);
      } catch (_) {}
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.player && typeof this.player.setVolume === 'function') {
      try {
        this.player.setVolume(Math.round(this.currentVolume * 100));
      } catch (_) {}
    }
  }

  public mute() {
    this.isMuted = true;
    if (this.player && typeof this.player.mute === 'function') {
      try {
        this.player.mute();
      } catch (_) {}
    }
  }

  public unMute() {
    this.isMuted = false;
    if (this.player && typeof this.player.unMute === 'function') {
      try {
        this.player.unMute();
        if (typeof this.player.setVolume === 'function') {
          this.player.setVolume(Math.round(this.currentVolume * 100));
        }
      } catch (_) {}
    }
  }

  public getCurrentTime(): number {
    if (this.player && typeof this.player.getCurrentTime === 'function') {
      try {
        return this.player.getCurrentTime() || 0;
      } catch (_) {
        return 0;
      }
    }
    return 0;
  }

  public getDuration(): number {
    if (this.player && typeof this.player.getDuration === 'function') {
      try {
        return this.player.getDuration() || this._currentDuration;
      } catch (_) {
        return this._currentDuration;
      }
    }
    return this._currentDuration;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get activeVideoId(): string | null {
    return this.currentVideoId;
  }

  private handleStateChange(state: number) {
    // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    if (state === 1 && this.player) {
      try {
        if (this.isMuted) {
          if (typeof this.player.mute === 'function') this.player.mute();
        } else {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.setVolume === 'function') {
            this.player.setVolume(Math.round(this.currentVolume * 100));
          }
        }
      } catch (_) {}
    }
    switch (state) {
      case 1: // PLAYING
        this._isPlaying = true;
        try {
          const d = this.player.getDuration();
          if (d > 0) this._currentDuration = d;
        } catch (_) {}
        if (this.callbacks.onPlaying) this.callbacks.onPlaying();
        break;
      case 2: // PAUSED
        this._isPlaying = false;
        if (this.callbacks.onPaused) this.callbacks.onPaused();
        break;
      case 3: // BUFFERING
        if (this.callbacks.onBuffering) this.callbacks.onBuffering();
        break;
      case 0: // ENDED
        this._isPlaying = false;
        this.stopTimeTracking();
        if (this.callbacks.onEnded) this.callbacks.onEnded();
        break;
    }
  }

  private startTimeTracking() {
    this.stopTimeTracking();
    this.timeUpdateInterval = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        try {
          const cur = this.player.getCurrentTime() || 0;
          const dur = this.player.getDuration() || this._currentDuration;
          if (dur > 0) this._currentDuration = dur;
          if (this.callbacks.onTimeUpdate) {
            this.callbacks.onTimeUpdate(cur, dur);
          }
        } catch (_) {}
      }
    }, 250);
  }

  private stopTimeTracking() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
}

export const youtubeAudio = new YouTubeAudioService();
