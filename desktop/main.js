const { app, BrowserWindow, globalShortcut, Menu, Tray, shell } = require("electron");
const path = require("path");
const http = require("http");

let mainWindow = null;
let tray = null;
let authServer = null;
let authPort = 0;

// Register protocol handler for development & packaged app
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("song", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("song");
}

function handleAuthToken(token) {
  if (!token || !mainWindow) return;
  mainWindow.loadURL(`https://5ong.vercel.app/auth/callback?token=${encodeURIComponent(token)}`);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function handleProtocolUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const token = parsed.searchParams.get("token");
    if (token) {
      handleAuthToken(token);
    }
  } catch (err) {
    console.error("Error parsing protocol url:", err);
  }
}

// Start ephemeral local HTTP server to receive instant auth callback
function startAuthServer() {
  if (authServer) return;
  authServer = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${authPort}`);
      if (parsedUrl.pathname === "/auth-callback") {
        const token = parsedUrl.searchParams.get("token");
        if (token) {
          handleAuthToken(token);
        }
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>5ONG - Signed In</title><style>
body { font-family: system-ui, sans-serif; background: #faf6ff; color: #1a1528; display: grid; place-items: center; min-height: 100vh; margin: 0; }
.card { background: white; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 10px 30px rgba(155,127,232,0.2); max-width: 340px; }
h1 { font-size: 20px; margin: 12px 0 6px; }
p { font-size: 14px; color: #716b82; margin: 0; }
</style></head>
<body>
<div class="card">
  <h1>Successfully Signed In!</h1>
  <p>You can close this tab and return to the 5ONG Desktop app.</p>
</div>
<script>setTimeout(() => { try { window.close(); } catch(e){} }, 2500);</script>
</body></html>`);
        return;
      }
    } catch (e) {
      console.error("Auth server error:", e);
    }
    res.writeHead(404);
    res.end();
  });

  authServer.listen(0, "127.0.0.1", () => {
    authPort = authServer.address().port;
    console.log("Local auth loopback server listening on port", authPort);
  });
}

// Ensure single instance lock so protocol invocations send args to running instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    const protocolArg = commandLine.find((arg) => arg.startsWith("song://"));
    if (protocolArg) {
      handleProtocolUrl(protocolArg);
    }
  });
}

function openExternalAuthUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);
    u.searchParams.set("platform", "desktop");
    if (authPort) {
      u.searchParams.set("desktop_port", String(authPort));
    }
    shell.openExternal(u.toString());
  } catch (e) {
    shell.openExternal(targetUrl);
  }
}

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

  // Intercept Google OAuth and open in user's default system browser (Chrome/Edge/etc.)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes("/api/auth/google") || url.includes("accounts.google.com")) {
      openExternalAuthUrl(url);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.includes("/api/auth/google") || url.includes("accounts.google.com")) {
      event.preventDefault();
      openExternalAuthUrl(url);
    }
  });

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

  // Check if launched with protocol URL
  const launchArg = process.argv.find((arg) => arg.startsWith("song://"));
  if (launchArg) {
    handleProtocolUrl(launchArg);
  }
}

app.whenReady().then(() => {
  startAuthServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (authServer) {
    authServer.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
