import React, { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from "react-icons/fa";

function PlayerControls({
  onTogglePlay,
  isPlaying,
  onStationChange,
  currentStation,
  categories,
  selectedCategoryName,
  onSelectCategory,
}) {
  const [searchInput, setSearchInput] = useState("");
  const [filteredCategories, setFilteredCategories] = useState(categories);
  const intl = useIntl();

  // Stations can be YouTube (videoId) or HTML5 audio (audio url); use whichever
  // is present as the unique identity.
  const stationId = (s) => (s ? s.videoId || s.audio : undefined);

  const stations =
    categories.find((category) => category.name === selectedCategoryName)?.stations || [];

  // Update filteredCategories when categories prop changes
  useEffect(() => {
    setFilteredCategories(categories);
  }, [categories]);

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const searchValue = e.target.value;
    setSearchInput(searchValue);

    // Filter categories based on search input
    if (searchValue.trim() !== "") {
      const filtered = categories.filter((category) =>
        category.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  };

  // Clear search input when a category is selected
  const handleSelectCategory = (categoryName) => {
    onSelectCategory(categoryName);
    setSearchInput("");
    setFilteredCategories(categories);
  };

  const changeStation = (direction) => {
    const currentIndex = stations.findIndex(
      (station) => stationId(station) === stationId(currentStation)
    );
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % stations.length
        : (currentIndex - 1 + stations.length) % stations.length;
    onStationChange(stations[nextIndex]);
  };

  return (
    <div className="player-controls">
      <h3 className="title-cat-stat">{intl.formatMessage({ id: "category" })}</h3>
      <input
        type="text"
        value={searchInput}
        onChange={handleSearchInputChange}
        placeholder={intl.formatMessage({ id: "SearchCategory" })}
      />
      {filteredCategories.length > 0 ? (
        <div className="category-pills">
          {filteredCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => handleSelectCategory(category.name)}
              className={
                category.name === selectedCategoryName
                  ? "category-pill selected-category"
                  : "category-pill"
              }>
              {category.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="no-results">No results found.</div>
      )}

      {/* Stations Display */}
      <h3 className="title-cat-stat">{intl.formatMessage({ id: "stations" })}</h3>

      <div className="stations-container">
        {stations.map((station, index) =>
          index % 2 === 0 ? (
            <div className="station-row" key={index}>
              <button
                onClick={() => onStationChange(station)}
                className={
                  stationId(station) === stationId(currentStation)
                    ? "btn-station active-station"
                    : "btn-station"
                }>
                <img
                  className="station-picture"
                  src={station.picture}
                  alt={station.name}
                  width={24}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "lofi-girl.webp";
                  }}
                />
                {station.name}
              </button>

              {/* Check if there is a next station to form the pair */}
              {stations[index + 1] && (
                <button
                  onClick={() => onStationChange(stations[index + 1])}
                  className={
                    stationId(stations[index + 1]) === stationId(currentStation)
                      ? "btn-station active-station"
                      : "btn-station"
                  }>
                  <img
                    className="station-picture"
                    src={stations[index + 1].picture}
                    alt={stations[index + 1].name}
                    width={24}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "lofi-girl.webp";
                    }}
                  />
                  {stations[index + 1].name}
                </button>
              )}
            </div>
          ) : null
        )}
      </div>

      {/* Now playing indicator */}
      {currentStation && (
        <div className={`now-playing ${isPlaying ? "is-playing" : ""}`}>
          <img
            className="now-playing-art"
            src={currentStation.picture}
            alt=""
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "lofi-girl.webp";
            }}
          />
          <div className="now-playing-info">
            <span className="now-playing-label">
              {isPlaying && <span className="pulsing-circle" />}
              {isPlaying ? "Now Playing" : "Paused"}
            </span>
            <span className="now-playing-name">{currentStation.name}</span>
          </div>
        </div>
      )}

      {/* Play/Pause Button */}
      <div className="pause-play-buttons">
        <button onClick={() => changeStation("prev")} aria-label="Previous">
          <FaStepBackward />
        </button>
        <button onClick={onTogglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button onClick={() => changeStation("next")} aria-label="Next">
          <FaStepForward />
        </button>
      </div>
    </div>
  );
}

export default PlayerControls;
