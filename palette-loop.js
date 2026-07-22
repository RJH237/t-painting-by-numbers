"use strict";

// v0.8: keep the phone colour wheel moving continuously by repeating the
// palette before and after the real controls and silently recentring it.
const paletteGrid = document.querySelector("#palette-grid");

if (paletteGrid) {
  let cycleHeight = 0;
  let scrollFrame = 0;
  let setupFrame = 0;

  const isPhoneLayout = () => document.documentElement.dataset.device === "phone";

  function removeCopies() {
    paletteGrid.querySelectorAll('[data-palette-copy]:not([data-palette-copy="0"])').forEach((button) => button.remove());
    paletteGrid.querySelectorAll('[data-palette-copy="0"]').forEach((button) => button.removeAttribute("data-palette-copy"));
    paletteGrid.classList.remove("is-looping");
    cycleHeight = 0;
  }

  function clonePaletteButton(button, copy) {
    const clone = button.cloneNode(true);
    clone.dataset.paletteCopy = copy;
    clone.setAttribute("aria-hidden", "true");
    clone.tabIndex = -1;
    return clone;
  }

  function installLoop() {
    cancelAnimationFrame(setupFrame);
    setupFrame = requestAnimationFrame(() => {
      removeCopies();
      if (!isPhoneLayout()) return;

      const originals = [...paletteGrid.querySelectorAll(".palette-swatch")];
      if (originals.length < 2) return;

      originals.forEach((button) => { button.dataset.paletteCopy = "0"; });

      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      originals.forEach((button) => {
        before.appendChild(clonePaletteButton(button, "-1"));
        after.appendChild(clonePaletteButton(button, "1"));
      });
      paletteGrid.prepend(before);
      paletteGrid.append(after);
      paletteGrid.classList.add("is-looping");

      requestAnimationFrame(() => {
        const firstOriginal = paletteGrid.querySelector('[data-palette-copy="0"]');
        const firstAfter = paletteGrid.querySelector('[data-palette-copy="1"]');
        if (!firstOriginal || !firstAfter) return;
        cycleHeight = firstAfter.offsetTop - firstOriginal.offsetTop;
        if (cycleHeight > 0) paletteGrid.scrollTop = cycleHeight;
      });
    });
  }

  function keepScrollInMiddleCopy() {
    if (!cycleHeight || !isPhoneLayout()) return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const upperBoundary = cycleHeight * 0.5;
      const lowerBoundary = cycleHeight * 1.5;
      if (paletteGrid.scrollTop < upperBoundary) {
        paletteGrid.scrollTop += cycleHeight;
      } else if (paletteGrid.scrollTop > lowerBoundary) {
        paletteGrid.scrollTop -= cycleHeight;
      }
    });
  }

  paletteGrid.addEventListener("scroll", keepScrollInMiddleCopy, { passive: true });

  paletteGrid.addEventListener("click", (event) => {
    const copy = event.target.closest('.palette-swatch[data-palette-copy]:not([data-palette-copy="0"])');
    if (!copy) return;
    const original = paletteGrid.querySelector(`.palette-swatch[data-palette-copy="0"][data-colour="${copy.dataset.colour}"]`);
    original?.click();
  });

  const observer = new MutationObserver((mutations) => {
    const paletteWasRebuilt = mutations.some((mutation) =>
      [...mutation.addedNodes].some((node) => node instanceof Element && node.matches?.(".palette-swatch:not([data-palette-copy])")),
    );
    if (paletteWasRebuilt) installLoop();
  });
  observer.observe(paletteGrid, { childList: true });

  window.addEventListener("painted:layoutchange", installLoop);
  window.addEventListener("resize", () => {
    if (isPhoneLayout() && paletteGrid.classList.contains("is-looping")) installLoop();
  }, { passive: true });

  installLoop();
}
