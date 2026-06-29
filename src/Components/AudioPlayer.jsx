import React, { useEffect, useRef, useState } from "react";
import VolumeControl from "./VolumeControl";

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

  const isAudio = !!station.audio;
  const seekable = isAudio && isFinite(duration) && duration > 0;

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

  // Media Session: metadata + playback state (changes only with station/play).
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: station.name,
        artist: "Lofi Radio",
        artwork: [{ src: artworkFor(station), sizes: "512x512" }],
      });
    } catch (_) {
      /* MediaMetadata unsupported */
    }
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [station, isPlaying]);

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

  const onSeek = (e) => {
    const v = Number(e.target.value);
    const a = audioRef.current;
    if (a) a.currentTime = v;
    setCurrentTime(v);
    savePos(v);
  };

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
