window.chatApp = window.chatApp || {};
window.chatApp.sendButton = document.querySelector("#button");

function handleResponsiveLayout() {
  const windowWidth = window.innerWidth;

  const buttonContainer = document.querySelector(".button-container");
  const typingInput = document.querySelector(".typing-input");

  if (typingInput) {
    typingInput.style.flexGrow = "1";
    typingInput.style.width = "calc(100% - 90px)";
  }

  if (buttonContainer) {
    buttonContainer.style.justifyContent = "";
    buttonContainer.style.gap = "8px";
  }

  if (windowWidth < 600) {
    if (buttonContainer) {
      buttonContainer.style.justifyContent = "flex-end";
      buttonContainer.style.gap = "6px";
    }
    if (typingInput) {
      typingInput.style.width = "calc(100% - 70px)";
    }
  }
}

function enhancedInitializeApp() {
  window.chatApp = window.chatApp || {};
  window.chatApp.sendButton = document.querySelector("#button");

  if (typeof initializeApp === "function") {
    initializeApp();
  }

  handleResponsiveLayout();

  window.addEventListener("resize", handleResponsiveLayout);
  window.addEventListener("orientationchange", handleResponsiveLayout);
}

document.addEventListener("DOMContentLoaded", enhancedInitializeApp);
