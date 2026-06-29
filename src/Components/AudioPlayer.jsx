import React, { useEffect, useRef, useState } from "react";
import VolumeControl from "./VolumeControl";

/**
 * Plays a station either via the YouTube IFrame API (station.videoId)
 * or via a plain HTML5 <audio> element (station.audio — a live stream
 * URL or an on-demand mp3). Only one source is active at a time.
 *
 * For finite-length audio (the on-demand mp3s, not live streams) it shows a
 * seek bar and remembers the playback position per track in localStorage.
 */
// A valid video id used only to initialize the YT player. Creating the player
// with an empty videoId can prevent onReady from firing, which would leave the
// player null and silent. This seed is never auto-played.
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

function AudioPlayer({ station, isPlaying }) {
  const [ytPlayer, setYtPlayer] = useState(null);
  const audioRef = useRef(null);
  const volumeRef = useRef(50); // 0-100, shared between both players
  const lastSaveRef = useRef(0);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const isAudio = !!station.audio;
  // Only finite-length audio (mp3s) is seekable — live streams report Infinity.
  const seekable = isAudio && isFinite(duration) && duration > 0;

  // Persist current position for the active mp3 (skips live streams).
  const savePos = (t) => {
    if (!isAudio) return;
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    if (typeof t !== "number" || !isFinite(t) || t <= 0) return;
    localStorage.setItem(posKey(station.audio), String(t));
  };

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
      // Stop YouTube, drive the <audio> element.
      if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
      const a = audioRef.current;
      if (a) {
        if (a.getAttribute("src") !== station.audio) {
          // Save the outgoing track's position before swapping sources.
          const oldSrc = a.getAttribute("src");
          if (oldSrc && isFinite(a.duration) && a.currentTime > 0) {
            localStorage.setItem(posKey(oldSrc), String(a.currentTime));
          }
          a.src = station.audio;
          a.load();
          setDuration(0);
          setCurrentTime(0);
        }
        a.volume = volumeRef.current / 100;
        if (isPlaying) a.play().catch(() => {});
      }
    } else {
      // Stop <audio>, drive YouTube. Save the outgoing track's position first
      // (onPause can't — isAudio is already false by the time it fires).
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

  const setVolume = (volume) => {
    volumeRef.current = Number(volume);
    if (audioRef.current) audioRef.current.volume = volumeRef.current / 100;
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(volumeRef.current);
  };

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
    setCurrentTime(a.currentTime);
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

      <VolumeControl setVolume={setVolume} />

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPause={() => savePos(audioRef.current?.currentTime)}
        onEnded={() => localStorage.removeItem(posKey(station.audio))}
      />
      <div id="player"></div>
    </div>
  );
}

export default AudioPlayer;
