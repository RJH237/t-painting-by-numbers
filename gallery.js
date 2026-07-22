"use strict";

import { COLOUR_COUNT, PAINTINGS, progressKey } from "./paintings.js";

const grid = document.querySelector("#painting-grid");

for (const [id, painting] of Object.entries(PAINTINGS)) {
  const { completed, percent } = readProgress(id);
  const article = document.createElement("article");
  article.className = "painting-card";
  article.dataset.painting = id;

  const imageWrap = document.createElement("div");
  imageWrap.className = `painting-image-wrap${painting.orientation === "portrait" ? " portrait" : ""}`;
  const image = document.createElement("img");
  image.src = painting.image;
  image.alt = painting.alt;
  image.loading = "lazy";
  imageWrap.append(image);

  const difficulty = document.createElement("span");
  difficulty.className = "difficulty";
  difficulty.textContent = painting.difficulty;
  imageWrap.append(difficulty);

  const copy = document.createElement("div");
  copy.className = "painting-card-copy";

  const byline = document.createElement("p");
  byline.textContent = `${painting.artist} · ${painting.year}`;
  const title = document.createElement("h3");
  title.textContent = painting.title;

  const progress = document.createElement("div");
  progress.className = "card-progress";
  progress.setAttribute("aria-label", completed ? `${percent}% complete` : "No progress yet");
  progress.innerHTML = `<span><i style="width: ${percent}%"></i></span><strong>${completed ? `${percent}% complete` : "Not started"}</strong>`;

  const link = document.createElement("a");
  link.className = "start-button";
  link.href = `paint.html?id=${encodeURIComponent(id)}`;
  link.innerHTML = `${completed ? "Continue" : "Start"} painting <span aria-hidden="true">→</span>`;
  link.setAttribute("aria-label", `${completed ? "Continue" : "Start"} painting ${painting.title}`);

  copy.append(byline, title, progress, link);
  article.append(imageWrap, copy);
  grid.append(article);
}

function readProgress(id) {
  let completed = 0;
  let total = COLOUR_COUNT;
  try {
    const stored = JSON.parse(localStorage.getItem(progressKey(id)) || "null");
    if (stored && Array.isArray(stored.filled) && Number.isInteger(stored.total)) {
      completed = new Set(stored.filled).size;
      total = stored.total;
    }
  } catch {
    // A malformed local value should not stop the gallery from loading.
  }
  return { completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}
