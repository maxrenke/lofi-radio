import React, { useEffect, useRef, useState } from "react";
import VolumeControl from "./VolumeControl";

/**
 * Plays a station either via the YouTube IFrame API (station.videoId)
 * or via a plain HTML5 <audio> element (station.audio — a live stream
 * URL or an on-demand mp3). Only one source is active at a time.
 */
// A valid video id used only to initialize the YT player. Creating the player
// with an empty videoId can prevent onReady from firing, which would leave the
// player null and silent. This seed is never auto-played.
const YT_SEED_VIDEO_ID = "jfKfPfyJRdk";

function AudioPlayer({ station, isPlaying }) {
  const [ytPlayer, setYtPlayer] = useState(null);
  const audioRef = useRef(null);
  const volumeRef = useRef(50); // 0-100, shared between both players

  const isAudio = !!station.audio;

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
          a.src = station.audio;
          a.load();
        }
        a.volume = volumeRef.current / 100;
        if (isPlaying) a.play().catch(() => {});
      }
    } else {
      // Stop <audio>, drive YouTube.
      if (audioRef.current) audioRef.current.pause();
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

  const setVolume = (volume) => {
    volumeRef.current = Number(volume);
    if (audioRef.current) audioRef.current.volume = volumeRef.current / 100;
    if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(volumeRef.current);
  };

  return (
    <div className="audio-player">
      <VolumeControl setVolume={setVolume} />
      <audio ref={audioRef} preload="none" />
      <div id="player"></div>
    </div>
  );
}

export default AudioPlayer;
