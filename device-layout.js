"use strict";

export function detectDeviceLayout({
  userAgentMobile = false,
  userAgent = "",
  coarsePointer = false,
  screenWidth = Infinity,
  screenHeight = Infinity,
} = {}) {
  const mobileUserAgent = /Android.+Mobile|iPhone|iPod|IEMobile|Opera Mini|Mobile/i.test(userAgent);
  const phoneSizedTouchscreen = coarsePointer && Math.min(screenWidth, screenHeight) <= 600;
  return userAgentMobile || mobileUserAgent || phoneSizedTouchscreen ? "phone" : "desktop";
}

function installDeviceLayout() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const userAgentMobile = navigator.userAgentData?.mobile === true;

  const updateViewportHeight = () => {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
  };

  const updateLayout = () => {
    const next = detectDeviceLayout({
      userAgentMobile,
      userAgent: navigator.userAgent,
      coarsePointer: coarsePointer.matches,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });
    const previous = document.documentElement.dataset.device;
    document.documentElement.dataset.device = next;
    updateViewportHeight();
    if (previous && previous !== next) {
      window.dispatchEvent(new CustomEvent("painted:layoutchange", { detail: { device: next } }));
    }
  };

  updateLayout();
  coarsePointer.addEventListener?.("change", updateLayout);
  window.addEventListener("orientationchange", updateLayout);
  window.addEventListener("resize", updateViewportHeight, { passive: true });
  window.visualViewport?.addEventListener("resize", updateViewportHeight, { passive: true });
}

installDeviceLayout();
