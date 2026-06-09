import React from "react";

// Controlled dropdown. All background side effects (body image, video element,
// overlay opacity) are handled by the parent so React owns the DOM.
function BackgroundSelector({ value, options = [], onChange }) {
  return (
    <div>
      <select
        className="selector-bg-img"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        <option value="None">None</option>
        {options.map((image) => (
          <option key={image.name} value={image.name}>
            {image.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default BackgroundSelector;
