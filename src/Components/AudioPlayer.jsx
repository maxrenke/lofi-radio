import React, { useEffect, useRef, useState } from "react";
import { FaSpotify, FaYoutube } from "react-icons/fa";
import VolumeControl from "./VolumeControl";

const searchUrl = (svc, q) =>
  svc === "spotify"
    ? "https://open.spotify.com/search/" + encodeURIComponent(q)
    : "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);

/**
 * Plays a station either via the YouTube IFrame API (station.videoId)
 * or via a plain HTML5 <audio> element (station.audio — a live stream
 * URL or an on-demand mp3). Only one source is active at a time.
 *
 * Finite-length audio (on-demand mp3s) also gets a seek bar and remembers its
 * position per track. The OS/browser Media Session is wired up for both.
 */
const YT_SEED_VIDEO_ID = "jfKfPfyJRdk";

const posKey = (url) => "lofi:trackpos:" + url;

const fmtTime = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return (h > 0 ? h + ":" : "") + mm + ":" + String(sec).padStart(2, "0");
};

const artworkFor = (station) => {
  const pic = station.picture || "";
  return pic.startsWith("http") ? pic : `${window.location.origin}/${pic}`;
};

function AudioPlayer({
  station,
  isPlaying,
  volume,
  onVolumeChange,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onStationError,
  onPlaying,
}) {
  const [ytPlayer, setYtPlayer] = useState(null);
  const audioRef = useRef(null);
  const volumeRef = useRef(volume);
  const lastSaveRef = useRef(0);
  const lastSecRef = useRef(-1);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [chapters, setChapters] = useState([]);
  const [chapterIdx, setChapterIdx] = useState(-1);
  const [showTracklist, setShowTracklist] = useState(false);

  const isAudio = !!station.audio;
  const seekable = isAudio && isFinite(duration) && duration > 0;
  const currentTrack = chapterIdx >= 0 ? chapters[chapterIdx]?.title || "" : "";

  const savePos = (t) => {
    if (!isAudio) return;
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    if (typeof t !== "number" || !isFinite(t) || t <= 0) return;
    localStorage.setItem(posKey(station.audio), String(t));
  };

  // Keep latest volume available to async callbacks (onReady) without re-deps.
  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(volume);
  }, [volume, ytPlayer]);

  // Fetch the chapter/tracklist sidecar for finite mp3s (e.g. C89.5 shows).
  // Browsers don't expose ID3 chapters from <audio>, so we serve a JSON sidecar.
  useEffect(() => {
    setChapters([]);
    setChapterIdx(-1);
    setShowTracklist(false);
    if (!isAudio || !/\.mp3$/i.test(station.audio)) return;
    const url = station.audio.replace(/\.mp3$/i, ".chapters.json");
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length) setChapters(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  // Load the YouTube IFrame API once and build the (hidden) player.
  useEffect(() => {
    const buildPlayer = () => {
      if (ytPlayer) return;
      // eslint-disable-next-line no-new
      new window.YT.Player("player", {
        height: "0",
        width: "0",
        videoId: station.videoId || YT_SEED_VIDEO_ID,
        playerVars: { autoplay: 0 },
        events: {
          onReady: (event) => {
            event.target.setVolume(volumeRef.current);
            setYtPlayer(event.target);
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) onPlaying && onPlaying();
          },
          onError: () => onStationError && onStationError(),
        },
      });
    };

    if (window.YT && window.YT.Player) {
      buildPlayer();
      return;
    }
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      buildPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to station changes.
  useEffect(() => {
    if (isAudio) {
      if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      const a = audioRef.current;
      if (a) {
        if (a.getAttribute("src") !== station.audio) {
          const oldSrc = a.getAttribute("src");
          if (oldSrc && isFinite(a.duration) && a.currentTime > 0) {
            localStorage.setItem(posKey(oldSrc), String(a.currentTime));
          }
          a.src = station.audio;
          a.load();
          setDuration(0);
          setCurrentTime(0);
          lastSecRef.current = -1;
        }
        a.volume = volumeRef.current / 100;
        if (isPlaying) a.play().catch(() => {});
      }
    } else {
      const a = audioRef.current;
      if (a) {
        const src = a.getAttribute("src");
        if (src && isFinite(a.duration) && a.currentTime > 0) {
          localStorage.setItem(posKey(src), String(a.currentTime));
        }
        a.pause();
      }
      setDuration(0);
      setCurrentTime(0);
      if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(station.videoId);
        if (!isPlaying) ytPlayer.pauseVideo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, ytPlayer]);

  // React to play/pause.
  useEffect(() => {
    if (isAudio) {
      const a = audioRef.current;
      if (!a) return;
      if (isPlaying) a.play().catch(() => {});
      else a.pause();
    } else if (ytPlayer && ytPlayer.getPlayerState) {
      if (isPlaying && ytPlayer.getPlayerState() !== window.YT.PlayerState.PLAYING) {
        ytPlayer.playVideo();
      } else if (!isPlaying && ytPlayer.getPlayerState() !== window.YT.PlayerState.PAUSED) {
        ytPlayer.pauseVideo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isAudio, ytPlayer]);

  // Media Session: metadata + playback state. When a tracklist is present the
  // current track becomes the title and the station name becomes the artist.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack || station.name,
        artist: currentTrack ? station.name : "Lofi Radio",
        artwork: [{ src: artworkFor(station), sizes: "512x512" }],
      });
    } catch (_) {
      /* MediaMetadata unsupported */
    }
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [station, isPlaying, currentTrack]);

  // Media Session: action handlers (rebind when the app's callbacks change).
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const set = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (_) {
        /* action unsupported */
      }
    };
    set("play", () => onPlay && onPlay());
    set("pause", () => onPause && onPause());
    set("previoustrack", () => onPrev && onPrev());
    set("nexttrack", () => onNext && onNext());
    set("seekto", (d) => {
      const a = audioRef.current;
      if (a && d.seekTime != null && isFinite(a.duration)) {
        a.currentTime = d.seekTime;
        setCurrentTime(d.seekTime);
      }
    });
  }, [onPlay, onPause, onPrev, onNext]);

  // Save position when the tab/app is closed.
  useEffect(() => {
    const handler = () => {
      const a = audioRef.current;
      if (a) savePos(a.currentTime);
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAudio, station.audio]);

  const onLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    setDuration(a.duration);
    if (isFinite(a.duration)) {
      const saved = parseFloat(localStorage.getItem(posKey(station.audio)) || "");
      if (isFinite(saved) && saved > 0 && saved < a.duration - 2) {
        a.currentTime = saved;
        setCurrentTime(saved);
        return;
      }
    }
    setCurrentTime(a.currentTime);
  };

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    // Re-render at most ~once per second (the UI only shows whole seconds).
    const whole = Math.floor(a.currentTime);
    if (whole !== lastSecRef.current) {
      lastSecRef.current = whole;
      setCurrentTime(a.currentTime);
      // Current chapter = last one whose start time we've passed.
      if (chapters.length) {
        let idx = -1;
        for (let i = 0; i < chapters.length; i++) {
          if (a.currentTime >= chapters[i].start) idx = i;
          else break;
        }
        setChapterIdx(idx); // React skips the re-render if unchanged
      }
      if ("mediaSession" in navigator && navigator.mediaSession.setPositionState && isFinite(a.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            position: Math.min(a.currentTime, a.duration),
            playbackRate: 1,
          });
        } catch (_) {
          /* ignore */
        }
      }
    }
    const now = Date.now();
    if (now - lastSaveRef.current > 3000) {
      savePos(a.currentTime);
      lastSaveRef.current = now;
    }
  };

  const seekTo = (t) => {
    const a = audioRef.current;
    if (a) a.currentTime = t;
    setCurrentTime(t);
    savePos(t);
  };

  const onSeek = (e) => seekTo(Number(e.target.value));

  return (
    <div className="audio-player">
      {seekable && (
        <div className="track-scrubber">
          <span className="track-time">{fmtTime(currentTime)}</span>
          <input
            type="range"
            className="track-range"
            min="0"
            max={duration}
            step="1"
            value={Math.min(currentTime, duration)}
            onChange={onSeek}
            aria-label="Seek"
          />
          <span className="track-time">-{fmtTime(Math.max(0, duration - currentTime))}</span>
        </div>
      )}

      {chapters.length > 0 && (
        <div className="tracklist-wrap">
          <button
            className="tracklist-current"
            onClick={() => setShowTracklist((v) => !v)}
            aria-expanded={showTracklist}>
            <span className="tl-now">♪ {currentTrack || "—"}</span>
            <span className="tl-caret">{showTracklist ? "▴" : "▾"}</span>
          </button>
          {showTracklist && (
            <ol className="tracklist">
              {chapters.map((c, i) => (
                <li
                  key={i}
                  className={"tl-item" + (i === chapterIdx ? " active" : "")}
                  onClick={() => seekTo(c.start)}>
                  <span className="tl-time">{fmtTime(c.start)}</span>
                  <span className="tl-title">{c.title}</span>
                  {c.title && (
                    <span className="tl-links">
                      <a
                        href={searchUrl("spotify", c.title)}
                        target="_blank"
                        rel="noreferrer"
                        title="Search on Spotify"
                        className="tl-link tl-spotify"
                        onClick={(e) => e.stopPropagation()}>
                        <FaSpotify />
                      </a>
                      <a
                        href={searchUrl("youtube", c.title)}
                        target="_blank"
                        rel="noreferrer"
                        title="Search on YouTube"
                        className="tl-link tl-youtube"
                        onClick={(e) => e.stopPropagation()}>
                        <FaYoutube />
                      </a>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlaying={() => onPlaying && onPlaying()}
        onError={() => onStationError && onStationError()}
        onPause={() => savePos(audioRef.current?.currentTime)}
        onEnded={() => localStorage.removeItem(posKey(station.audio))}
      />
      <div id="player"></div>
    </div>
  );
}

export default AudioPlayer;
