import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";

window.addEventListener("DOMContentLoaded", (_) => {
  const root = document.createElement("div");
  document.body.style.margin = "0";
  root.style.margin = "0";
  document.body.appendChild(root);
  ReactDOM.render(<App />, root);
});
