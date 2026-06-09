import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { useIntl } from "react-intl";
import AudioPlayer from "./Components/AudioPlayer";
import PlayerControls from "./Components/PlayerControls";
import Footer from "./Components/Footer";
import "./index.css";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import BackgroundSelector from "./Components/BackgroundSelector";
import { FaInfoCircle, FaArrowDown, FaArrowUp } from "react-icons/fa";
import { BsFullscreen, BsFullscreenExit } from "react-icons/bs";
import { MdCloseFullscreen } from "react-icons/md";
import { IoMdOpen } from "react-icons/io";

import ModalInfo from "./Components/ModalInfo";
import { useLanguage } from "./LanguageContext";

function App() {
  const intl = useIntl();
  const { language, setLanguage } = useLanguage();

  const [categories, setCategories] = useState([]);
  const [currentStation, setCurrentStation] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAppVisible, setIsAppVisible] = useState(true);

  // Background selection (lifted here so the <video> is rendered declaratively
  // by React — otherwise re-renders would reset DOM changes and hide it).
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBg, setSelectedBg] = useState(
    localStorage.getItem("selectedBackgroundName") || "None"
  );
  const bgVideoRef = useRef(null);
  const bgUrl = backgrounds.find((b) => b.name === selectedBg)?.url;
  const bgIsVideo = /\.(mp4|webm)$/i.test(bgUrl || "");

  const hideApp = () => setIsAppVisible(false);
  const showApp = () => setIsAppVisible(true);

  const toggleFullScreen = () => {
    if (!isFullScreen) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullScreen(true))
        .catch((err) => console.error("Error al activar pantalla completa", err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullScreen(false))
        .catch((err) => console.error("Error al salir de pantalla completa", err));
    }
  };

  const [background, setBackground] = useState(
    localStorage.getItem("background") || "defaultBackground"
  );
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  useEffect(() => {
    localStorage.setItem("background", background);
  }, [background]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "dark";
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    fetch("/stations.json")
      .then((response) => response.json())
      .then((data) => {
        setCategories(data.categories);
        if (data.categories.length === 0) return;

        setSelectedCategoryName(data.categories[0].name);

        // Restore the last played station, but only if it still exists in the
        // current station list — IDs rotate, so a saved station may be gone.
        const lastStation = JSON.parse(localStorage.getItem("lastStation"));
        const idOf = (s) => (s ? s.videoId || s.audio : undefined);
        const stillExists =
          lastStation &&
          idOf(lastStation) &&
          data.categories.some((cat) =>
            cat.stations.some((s) => idOf(s) === idOf(lastStation))
          );

        // Select a station but do NOT auto-play; wait for the user to hit play.
        if (stillExists) {
          setCurrentStation(lastStation);
        } else if (data.categories[0].stations.length > 0) {
          setCurrentStation(data.categories[0].stations[0]);
        }
      });
  }, []);

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
    setFavorites(savedFavorites);
  }, []);

  // Load the list of available backgrounds.
  useEffect(() => {
    fetch("/backgroundImages.json")
      .then((res) => res.json())
      .then((data) => setBackgrounds(data))
      .catch(() => {});
  }, []);

  // Apply the selected background: image -> body background, video -> <video>,
  // and dim the panel overlay accordingly.
  useEffect(() => {
    localStorage.setItem("selectedBackgroundName", selectedBg);
    const root = document.documentElement;
    if (!bgUrl || selectedBg === "None") {
      document.body.style.backgroundImage = "none";
      root.style.setProperty("--app-background-opacity", "0.8");
    } else if (bgIsVideo) {
      document.body.style.backgroundImage = "none";
      root.style.setProperty("--app-background-opacity", "0.5");
    } else {
      document.body.style.backgroundImage = `url(${bgUrl})`;
      root.style.setProperty("--app-background-opacity", "0.3");
    }
  }, [selectedBg, bgUrl, bgIsVideo]);

  // Ensure the background video is muted (so autoplay is allowed) and playing.
  useEffect(() => {
    const v = bgVideoRef.current;
    if (bgIsVideo && v) {
      v.muted = true;
      v.load();
      v.play().catch(() => {});
    }
  }, [bgUrl, bgIsVideo]);

  const handleStationChange = (newStation) => {
    setCurrentStation(newStation);
    setIsPlaying(true);
    localStorage.setItem("lastStation", JSON.stringify(newStation));
  };

  const onTogglePlay = () => {
    setIsPlaying((prevIsPlaying) => !prevIsPlaying);
  };

  const toggleFavorite = (station) => {
    let updatedFavorites = JSON.parse(localStorage.getItem("favorites")) || {};
    const category = station.category;

    if (!updatedFavorites[category]) updatedFavorites[category] = [];

    if (updatedFavorites[category].some((fav) => fav.videoId === station.videoId)) {
      updatedFavorites[category] = updatedFavorites[category].filter(
        (fav) => fav.videoId !== station.videoId
      );
    } else {
      updatedFavorites[category].push(station);
    }

    if (updatedFavorites[category].length === 0) {
      delete updatedFavorites[category];
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
  };

  if (!currentStation) return <div>{intl.formatMessage({ id: "loadingStations" })}</div>;

  return (
    <>
      {bgIsVideo && (
        <video
          ref={bgVideoRef}
          className="bg-video"
          src={bgUrl}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      <Helmet>
        <html lang={language} />
        <title>{intl.formatMessage({ id: "title" })}</title>
        <meta
          name="description"
          content={intl.formatMessage({ id: "description" })}
        />
        <meta
          name="keywords"
          content={intl.formatMessage({ id: "keywords" })}
        />
        <link
          rel="canonical"
          href="https://lofimusicradio.com/"
        />
        <meta
          property="og:title"
          content={intl.formatMessage({ id: "ogTitle" })}
        />
        <meta
          property="og:description"
          content={intl.formatMessage({ id: "ogDescription" })}
        />
        <meta
          property="og:url"
          content="https://lofimusicradio.com/"
        />
        <meta
          property="og:type"
          content="website"
        />
        <meta
          property="og:locale"
          content={language}
        />
        <meta
          property="og:locale:alternate"
          content={language === "es" ? "en" : "es"}
        />
      </Helmet>

      <div
        className={`app ${isCollapsed ? "app2" : ""} app-wrapper ${
          isAppVisible ? "" : "hidden"
        }`}
        data-theme={theme}>
        <header className="top-container">
          <h1 className="main-title">{intl.formatMessage({ id: "mainTitle" })}</h1>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="selector-bg-img">
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="it">Italiano</option>
            <option value="ru">Русский</option>
            <option value="zh">中文</option>
          </select>
          <Footer />
        </header>


        <div className="top-container-buttons">
          <div className="background-container">
            <BackgroundSelector
              value={selectedBg}
              options={backgrounds}
              onChange={setSelectedBg}
            />
          </div>
          <button
            onClick={toggleTheme}
            aria-label={intl.formatMessage({ id: "changeTheme" })}>
            {theme === "light" ? <MdDarkMode /> : <MdLightMode />}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            aria-label={intl.formatMessage({ id: "information" })}>
            <FaInfoCircle />
          </button>
          <button
            onClick={toggleFullScreen}
            aria-label="Activar o desactivar pantalla completa">
            {isFullScreen ? <BsFullscreenExit /> : <BsFullscreen />}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={intl.formatMessage({ id: "collapseExpand" })}>
            {isCollapsed ? <FaArrowDown /> : <FaArrowUp />}
          </button>

          <button onClick={hideApp}>
            <MdCloseFullscreen />
          </button>

          <ModalInfo
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}>
            <h2 className="texto-description">
              {intl.formatMessage({ id: "aboutLofiRadio" })}
            </h2>
            <p>{intl.formatMessage({ id: "aboutDescription" })}</p>
            <h3 className="texto-description">
              {intl.formatMessage({ id: "mainFeatures" })}
            </h3>
            <ul>
              <li>{intl.formatMessage({ id: "feature1" })}</li>
              <li>{intl.formatMessage({ id: "feature2" })}</li>
              <li>{intl.formatMessage({ id: "feature3" })}</li>
              <li>{intl.formatMessage({ id: "feature4" })}</li>
              <li>{intl.formatMessage({ id: "feature5" })}</li>
            </ul>
            <p>
              Created by <a href="https://joantomasmiralles.es">Joan Tomás</a>
            </p>
            <p>
              Working at <a href="https://www.wiberrentacar.com">Wiber Rent a Car</a>
            </p>
          </ModalInfo>
        </div>
        <main className={`colappse-body ${isCollapsed ? "collapsed" : ""}`}>
          <PlayerControls
            onTogglePlay={onTogglePlay}
            isPlaying={isPlaying}
            onStationChange={handleStationChange}
            currentStation={currentStation}
            categories={categories}
            selectedCategoryName={selectedCategoryName}
            onSelectCategory={setSelectedCategoryName}
          />
          <AudioPlayer
            station={currentStation}
            onStationChange={handleStationChange}
            isPlaying={isPlaying}
          />
        </main>
      </div>
      {!isAppVisible && (
        <button
          onClick={showApp}
          className="show-app-button">
          <IoMdOpen />
        </button>
      )}
    </>
  );
}

export default App;
