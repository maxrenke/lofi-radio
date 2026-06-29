import React, { useState } from "react";
import { FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import "./VolumeControl.css";

const PRESETS = [
  { label: "Mute", value: 0 },
  { label: "1", value: 1 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
];

// Controlled component: volume (0-100) and onVolumeChange come from the parent
// so the slider stays in sync with keyboard shortcuts and persistence.
function VolumeControl({ volume, onVolumeChange }) {
  const [prevVolume, setPrevVolume] = useState(volume || 50); // last non-zero
  const isMuted = Number(volume) === 0;

  const apply = (v) => {
    const n = Number(v);
    if (n !== 0) setPrevVolume(n);
    onVolumeChange(n);
  };

  const toggleMute = () => {
    if (isMuted) {
      apply(prevVolume || 50);
    } else {
      setPrevVolume(Number(volume));
      onVolumeChange(0);
    }
  };

  return (
    <div className="volume-control-wrap">
      <div className="volume-control">
        <div className="sound-off-on-buttons">
          <button
            className="boton-volumen"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => apply(e.target.value)}
          className="volume-slider"
        />
        <div className="volume-label">{volume}</div>
      </div>

      <div className="volume-presets">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            className={
              "volume-preset" + (Number(volume) === p.value ? " active" : "")
            }
            onClick={() => apply(p.value)}
            aria-label={`Set volume ${p.label}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default VolumeControl;
