const { ipcRenderer } = require('electron');

// Écoute des messages venant du processus principal
ipcRenderer.on('fromMain', (event, { output, sessionId }) => {
  // Affiche le message dans l'interface utilisateur
  const messageContainer = document.getElementById('messages'); // Assurez-vous que cet ID est correct
  const messageElement = document.createElement('div');
  messageElement.textContent = output; // Met le texte du message
  messageContainer.appendChild(messageElement); // Ajoute le message au conteneur
});
