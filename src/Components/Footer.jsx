import React from "react";

const Footer = () => {
  return (
    <div className="container-footer">
      <p className="p-footer">
        <a
          className="link-footer"
          href="https://ko-fi.com/joantomasmiralles"
          target="_blank">
          <img
            className="kofi-logo"
            src="/support_me_on_kofi_blue.webp"
            alt="Support me on Ko-fi"
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </a>
      </p>
    </div>
  );
};

export default Footer;
