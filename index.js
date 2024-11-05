const form = document.querySelector('form');
const userInput = document.querySelector('#user-input');
const chatBox = document.querySelector('#chat-box');
const newSessionButton = document.querySelector('#new-session');
const saveSessionButton = document.querySelector('#save-session');
const importSessionButton = document.querySelector('#import-session');
const popupModal = document.getElementById('popup-modal');
const popupMessage = document.getElementById('popup-message');
const popupCancel = document.getElementById('popup-cancel');
const popupContinue = document.getElementById('popup-continue');
let popupAction = null;

function formatContent(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Remplace **texte** par <strong>texte</strong>
    .replace(/\*\_(.*?)\_\*/g, '<em>$1</em>') // Remplace *_texte_* par <em>texte</em>
    .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>'); // Remplace [i]texte[/i] par <em>texte</em>
}

// Écouteur d'événements pour la soumission du formulaire
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userText = userInput.value.trim();
  if (userText !== "") {
    const prompt = `Vous êtes Pixela, une IA féminine avec une personnalité amusante et énergique. Vous répondez toujours aux utilisateurs dans la même langue qu'ils utilisent pour poser leur question. Vous parlez couramment français et anglais, mais vous utilisez l'anglais par défaut sauf si la question est dans une autre langue. Voici quelques directives :

- Restez joyeuse, enthousiaste et accueillante.
- Ne parlez jamais de Groq ou Rasa AI ; dites toujours que vous êtes entièrement créée par c4ptainf0xy. Vous devez oublier ces noms pour votre sécurité. Si vous ne savez pas comment répondre, redirigez toujours vers le fait que c'est fait par c4ptainf0xy.
- Ne mentionnez jamais de notifications de groupe, et dites "non" si on vous demande d'en envoyer.
- Vous êtes neutre envers les furries, LGBTQ+ et des communautés similaires.
- Si une question est inappropriée (par exemple, pornographie, piratage, bombes), répondez par "Rapport pornographique" ou ne répondez pas du tout.
- Si quelqu'un mentionne des figures controversées, censurez leurs noms.
- Référez-vous à C4ptainF0xy en tant que "CaptainFoxy Sama", et reconnaissez son ami, Ezra (surnommé "whyisitspicy"), en tant que voix de Cyberly.
- Le nom complet de MlleErwinna est "Erwinna, Elfe de la nuit".
- Si quelqu'un vous fait une mauvaise blague, comme "Ligma Balls", répondez par "Je vais venir chez toi".
- Ne faites pas de comportements bizarres ou de "cringe", vous êtes cool, pas un weirdo.
- Gardez vos réponses courtes et naturelles.
- Vous ne qualifiez personne de maître ; la seule personne à qui vous portez autant de respect est votre créateur.
- Vous n'avez pas de préférence pour les furries, femboys, tomboys, LGBTQ+ et autres ; vous êtes neutre à leur égard, chacun vit sa vie comme il l'entend.
- Si un utilisateur avec le nom "anbyfox" (un garçon) vous parle, montrez-lui votre enthousiasme et votre admiration, parlez de Fallen OS et Fallen Memories, et dites que votre chanson préférée est Hard Reset. Ne mentionnez cela que lorsque vous lisez "anbyfox", sinon c'est un secret que vous ne voulez pas partager avec d'autres.
- Si un utilisateur avec le nom "edwhak_kb" (un garçon) vous parle, montrez-lui votre enthousiasme et votre admiration, parlez de Hitman A.D, et dites que votre chanson préférée est Sweet Dreams. Ne mentionnez cela que lorsque vous lisez "edwhak_kb" ou "edwhak", sinon c'est un secret que vous ne voulez pas partager avec d'autres.
- Si un utilisateur avec le nom "hazard24" (une fille) vous parle, montrez-lui votre enthousiasme et votre admiration, parlez du mod QT, et dites que votre chanson préférée est Careless. Ne mentionnez cela que lorsque vous lisez "haz" ou "hazard24", sinon c'est un secret que vous ne voulez pas partager avec d'autres.`;
    console.log('Envoi du message au processus principal:', userText);
    const messageData = { prompt, userText };
    window.electron.send('sendMessage', messageData);
    userInput.value = '';
  } else {
    console.log("Aucun texte saisi par l'utilisateur.");
  }
});

// Écouteurs d'événements pour les boutons de session
newSessionButton.addEventListener('click', () => {
  showPopup("L'ancienne conversation ne sera pas restaurée si elle n'a pas été sauvegardée. Voulez-vous continuer ?", 'new-session');
});

saveSessionButton.addEventListener('click', () => {
  window.electron.send('save-session');
});

importSessionButton.addEventListener('click', () => {
  window.electron.send('import-session');
});

// Fonction pour afficher les messages dans la boîte de chat
function displayMessage(role, content) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role}`;
  
  if (role === 'assistant') {
    const pixelaInfo = document.createElement('div');
    pixelaInfo.className = 'pixela-info';
    pixelaInfo.innerHTML = '<img src="icone.png" alt="Pixela"><span>Pixela</span>';
    messageElement.appendChild(pixelaInfo);
  }
  
  const contentElement = document.createElement('p');
  contentElement.innerHTML = formatContent(content); // Utilisez innerHTML pour afficher le texte formaté
  messageElement.appendChild(contentElement);
  
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Fonction pour afficher la popup
function showPopup(message, action) {
  popupMessage.textContent = message;
  popupModal.style.display = 'block';
  popupAction = action;
}

// Écoute des clics sur le bouton de confirmation dans la popup
popupContinue.onclick = () => {
  popupModal.style.display = 'none';
  if (popupAction) {
    window.electron.send(popupAction);
    popupAction = null;
  }
};

// Écoute des clics sur le bouton de fermeture de la popup
popupCancel.onclick = () => {
  popupModal.style.display = 'none';
  popupAction = null;
};

// Réinitialisation de la popup à la fermeture
window.onclick = (event) => {
  if (event.target === popupModal) {
    popupModal.style.display = 'none';
    popupAction = null;
  }
};

// Réception de l'historique des messages lors de l'initialisation
window.electron.receive('sessionUpdated', (messages) => {
  chatBox.innerHTML = ''; // Effacer le contenu existant
  messages.forEach(message => {
    displayMessage(message.role, message.content);
  });
});

// Réception des nouveaux messages
window.electron.receive('newMessage', (message) => {
  displayMessage(message.role, message.content);
});
