const wifi = require('node-wifi');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Initialize wifi module
wifi.init({ iface: null });

// Known networks and their passwords
const knownNetworks = {
  "TP-Link_766C": "40471723",
  "Marreddy's F54": "lakshmipriya",
  "IARE-WIFI": "iarewifi",
  "Galaxy A20s3223": "lakshmipriya",
  "Galaxy S20 FE ARMRCSE": "asdfzxcv",
  "Vivo y29": "asma0987",
};

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  // 🔁 Reusable scan + send function
  function scanAndSend(win) {
    wifi.scan().then(networks => {
      console.log("🔄 Refreshed WiFi list");
      win.webContents.send('wifi-data', networks);
    }).catch(err => {
      console.error("Error refreshing WiFi:", err);
    });
  }

  win.webContents.on('did-finish-load', () => {
    console.log("Window loaded ✅");

    wifi.scan().then(networks => {
      console.log("Networks scanned ✅");
      console.log(networks);

      // Auto-connect to best known network
      const known = networks
        .filter(n => knownNetworks[n.ssid])
        .sort((a, b) => b.signal_level - a.signal_level);

      if (known.length > 0) {
        const best = known[0];
        console.log(`Auto-connecting to: ${best.ssid}`);

        wifi.connect({ ssid: best.ssid, password: knownNetworks[best.ssid] }, error => {
          if (error) {
            console.error(`❌ Connection to ${best.ssid} failed:`, error);
          } else {
            console.log(`✅ Connected to ${best.ssid}`);
            wifi.getCurrentConnections().then(current => {
              console.log("Now connected to:", current);
            }).catch(err => {
              console.error("Error getting current connection:", err);
            });
          }
        });
      } else {
        console.log("⚠️ No known networks available to connect");
      }

      win.webContents.send('wifi-data', networks);
    }).catch(err => {
      console.error("Error scanning WiFi:", err);
    });

    // 🔁 Refresh every 2 minutes (120000 ms)
    setInterval(() => scanAndSend(win), 120000);
  });
}

// Start the app
app.whenReady().then(createWindow);

// Manual connection handler
ipcMain.on('connect-to-wifi', (event, { ssid, password }) => {
  console.log(`Manual connect to: ${ssid}`);

  wifi.connect({ ssid, password }, error => {
    if (error) {
      console.error("Manual connection error:", error);
      event.sender.send('connection-result', { success: false, error: error.message });
    } else {
      console.log("Manual connection success ✅");

      wifi.getCurrentConnections().then(current => {
        console.log("Now connected to:", current);
      }).catch(err => {
        console.error("Error getting current connection:", err);
      });

      event.sender.send('connection-result', { success: true });
    }
  });
});
