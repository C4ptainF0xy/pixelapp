const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fetch = require('electron-fetch').default;
const fs = require('fs').promises;

let mainWindow;
const sessionFilePath = path.join(app.getPath('userData'), 'session.json');
let existingMessages = [];

// Création de la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'), // Chemin vers ton icône
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Chargement des messages depuis le fichier de session
async function loadMessages() {
  try {
    const data = await fs.readFile(sessionFilePath, 'utf8');
    if (!data) {
      console.log("Le fichier de session est vide.");
      return [];
    }
    console.log("Contenu du fichier de session :", data);
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log("Le fichier de session n'existe pas encore.");
      return [];
    }
    console.error("Erreur lors de la lecture du fichier de session : ", error);
    return [];
  }
}

// Sauvegarde des messages dans le fichier de session
async function saveMessages(messages) {
  try {
    await fs.writeFile(sessionFilePath, JSON.stringify(messages, null, 2), 'utf8');
    console.log(`Messages sauvegardés dans ${sessionFilePath}`);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des messages : ", error);
  }
}

// Gestion des messages envoyés par l'utilisateur
ipcMain.on('sendMessage', async (event, { prompt, userText }) => {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer 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"
  };

  // Ajout du message utilisateur
  existingMessages.push({ role: "user", content: userText });
  mainWindow.webContents.send('newMessage', { role: "user", content: userText });

  const apiMessages = [
    { role: "system", content: prompt },
    ...existingMessages
  ];

  const body = {
    model: "llama3-8b-8192",
    messages: apiMessages,
    temperature: 0.7,
    max_tokens: 384
  };

  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await response.json();

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const output = data.choices[0].message.content;
      existingMessages.push({ role: "assistant", content: output });
      mainWindow.webContents.send('newMessage', { role: "assistant", content: output });

      // Sauvegarde des messages après ajout de la réponse de l'IA
      await saveMessages(existingMessages);
    } else {
      console.log("Aucune réponse valide reçue de l'API.");
      mainWindow.webContents.send('newMessage', { role: "error", content: "Aucune réponse valide reçue." });
    }
  } catch (error) {
    console.error('Erreur lors de l\'appel à l\'API :', error);
    mainWindow.webContents.send('newMessage', { role: "error", content: "Une erreur s'est produite lors de la communication avec l'API." });
  }
});

// Gestion des nouvelles sessions
ipcMain.on('new-session', async () => {
  existingMessages = [];
  await saveMessages(existingMessages);
  mainWindow.webContents.send('sessionUpdated', existingMessages);
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    message: 'Nouvelle session démarrée. Toutes les conversations précédentes sont supprimées.'
  });
});

// Sauvegarde de la session
ipcMain.on('save-session', async () => {
  const savePath = dialog.showSaveDialogSync(mainWindow, {
    title: 'Sauvegarder la session',
    defaultPath: 'session.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });

  if (savePath) {
    const data = JSON.stringify(existingMessages, null, 2);
    await fs.writeFile(savePath, data, 'utf8');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'Session sauvegardée avec succès.'
    });
  }
});

// Importation de la session
ipcMain.on('import-session', async () => {
  const importPath = dialog.showOpenDialogSync(mainWindow, {
    title: 'Importer une session',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });

  if (importPath && importPath[0]) {
    try {
      const data = await fs.readFile(importPath[0], 'utf8');
      existingMessages = JSON.parse(data);
      await saveMessages(existingMessages);
      mainWindow.webContents.send('sessionUpdated', existingMessages);
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        message: 'Session importée avec succès.'
      });
    } catch (error) {
      console.error("Erreur lors de l'importation de la session :", error);
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        message: "Erreur lors de l'importation de la session."
      });
    }
  }
});

// Initialisation de l'application
app.on('ready', async () => {
  console.log("Chemin du fichier de session :", sessionFilePath);
  existingMessages = await loadMessages();
  createWindow();
  console.log("Messages chargés au démarrage :", existingMessages);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('sessionUpdated', existingMessages);
    console.log("Historique envoyé à l'interface utilisateur");
  });
});

// Gestion de la fermeture de l'application
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    console.log("Sauvegarde des messages avant fermeture de l'application...");
    await saveMessages(existingMessages);
    app.quit();
  }
});

// Réactivation de la fenêtre si elle est fermée
app.on('activate', () => {
  if (mainWindow === null) createWindow();
});