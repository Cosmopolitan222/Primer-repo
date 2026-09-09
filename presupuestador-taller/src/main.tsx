import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { tallerConfig } from "./config/taller.config";
import "./index.css";

document.documentElement.style.setProperty("--color-primary", tallerConfig.colorPrimario);
document.documentElement.style.setProperty(
  "--color-primary-dark",
  tallerConfig.colorPrimarioOscuro,
);
document.title = `Presupuesto online — ${tallerConfig.nombre}`;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
