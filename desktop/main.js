const { app, BrowserWindow, globalShortcut, Menu, Tray } = require("electron");
const path = require("path");

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: "5ONG - Created by Kunal Sachan",
    backgroundColor: "#faf6ff",
    icon: path.join(__dirname, "../public/logo.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false, // Keep audio playing seamlessly in background
    },
    autoHideMenuBar: true,
  });

  // Set App Metadata
  app.name = "5ONG";

  // Load production 5ONG application
  mainWindow.loadURL("https://5ong.vercel.app");

  // Customize window title
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow.setTitle("5ONG - Created by Kunal Sachan");
  });

  // Handle window close
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Register Global Media Shortcuts
  try {
    globalShortcut.register("MediaPlayPause", () => {
      mainWindow?.webContents.executeJavaScript(
        "window.__playerToggle ? window.__playerToggle() : document.querySelector('[data-play-button]')?.click()"
      );
    });
    globalShortcut.register("MediaNextTrack", () => {
      mainWindow?.webContents.executeJavaScript(
        "window.__playerNext ? window.__playerNext() : document.querySelector('[data-next-button]')?.click()"
      );
    });
    globalShortcut.register("MediaPreviousTrack", () => {
      mainWindow?.webContents.executeJavaScript(
        "window.__playerPrev ? window.__playerPrev() : document.querySelector('[data-prev-button]')?.click()"
      );
    });
  } catch (err) {
    console.warn("Could not register media keys:", err);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
