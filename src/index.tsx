import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";

window.addEventListener("DOMContentLoaded", (_) => {
  const root = document.createElement("div");
  document.body.style.margin = "0";
  root.style.margin = "0";
  const style = document.createElement("style");
  style.innerHTML = `
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    body > div > div {
      height: 100%;
    }
    body > div {
      height: 100%;
    }
  `;

  document.body.appendChild(style);

  document.body.appendChild(root);
  ReactDOM.render(<App />, root);
});
