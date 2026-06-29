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

function VolumeControl({ setVolume }) {
  const [volume, setVolumeState] = useState(50);
  const [prevVolume, setPrevVolume] = useState(50); // last non-zero volume
  const isMuted = Number(volume) === 0;

  const applyVolume = (v) => {
    const n = Number(v);
    setVolumeState(n);
    setVolume(n);
    if (n !== 0) setPrevVolume(n);
  };

  const toggleMute = () => {
    if (isMuted) {
      applyVolume(prevVolume || 50);
    } else {
      setPrevVolume(Number(volume));
      applyVolume(0);
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
          onChange={(e) => applyVolume(e.target.value)}
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
            onClick={() => applyVolume(p.value)}
            aria-label={`Set volume ${p.label}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default VolumeControl;
