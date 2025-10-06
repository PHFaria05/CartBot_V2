// API Key do Google AI Studio
const API_KEY = 'AIzaSyCk0V645HYE4GQtk5Z9tn1__zVcTzKB_tw';
const MODEL_NAME = 'gemini-2.0-flash-001';
const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
let currentChatId = Date.now().toString();
let chatHistory = JSON.parse(localStorage.getItem('carAssistChats')) || {};
let currentMessages = [];

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  setupEventListeners();
  loadChat(currentChatId);
});

function setupEventListeners() {
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('userInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('newChatBtn').addEventListener('click', newChat);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}
//carregar tema
function loadTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').textContent = '☀️';
  }
}
//escolher tema
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙';
}
//botao de novo chat
function newChat() {
  currentChatId = Date.now().toString();
  currentMessages = [];
  chatHistory[currentChatId] = { title: 'Nova conversa', messages: [] };
  saveChats();
  renderChatHistory();
  renderMessages();
}

function renderChatHistory() {
  const container = document.getElementById('chatHistory');
  container.innerHTML = '';
  Object.entries(chatHistory)
    .reverse()
    .forEach(([id, chat]) => {
      const title = chat.messages.length > 0 
        ? (chat.messages[0].text.length > 30 ? chat.messages[0].text.substring(0, 30) + '...' : chat.messages[0].text)
        : chat.title;
      const div = document.createElement('div');
      div.className = `p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${id === currentChatId ? 'bg-blue-50 dark:bg-gray-700 font-medium' : ''}`;
      div.textContent = title;
      div.onclick = () => loadChat(id);
      container.appendChild(div);
    });
}

function loadChat(id) {
  currentChatId = id;
  currentMessages = chatHistory[id]?.messages || [];
  renderMessages();
  renderChatHistory();
}

function renderMessages() {
  const container = document.getElementById('messages');
  container.innerHTML = '';

  if (currentMessages.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'text-center py-12 text-gray-500 dark:text-gray-400';
    welcome.innerHTML = `
      <div class="inline-block p-4 bg-blue-50 dark:bg-gray-800 rounded-xl mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold mb-2">Olá! Sou seu assistente automotivo 🚗</h2>
      <p class="max-w-md mx-auto">Pergunte sobre consumo de combustível, troca de óleo, capacidade do tanque, valores de peças e muito mais!</p>
    `;
    container.appendChild(welcome);
    return;
  }

  currentMessages.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = msg.role === 'user' ? 'message-user' : 'message-ai';

    const bubble = document.createElement('div');
    bubble.className = `bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`;

    if (msg.role === 'user') {
      bubble.textContent = msg.text;
    } else {

      const html = marked.parse(msg.text);
      bubble.innerHTML = html;
      hljs.highlightAll();
    }
//botao de copiar mensagem
    if (msg.role === 'model') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerHTML = '📋';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(msg.text);
        copyBtn.innerHTML = '✅';
        setTimeout(() => copyBtn.innerHTML = '📋', 2000);
      };
      bubble.appendChild(copyBtn);
    }

    msgDiv.appendChild(bubble);
    container.appendChild(msgDiv);
  });

  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chatContainer');
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  // Adicionar mensagem do usuário
  currentMessages.push({ role: 'user', text });
  saveCurrentChat();
  renderMessages();
  input.value = '';
  input.style.height = '56px';

  // Mostrar animação de "digitando"
  showTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
            role: "user",
            parts: [{
              text: `Você é um assistente especializado em veículos para leigos. Responda de forma clara, simples e prática. 
              Tópicos comuns: consumo de combustível (km/l), como trocar óleo, capacidade do tanque, valor médio de peças, 
              manutenção básica, significado de luzes no painel, etc. 
              Se a pergunta não for sobre carros, gentilmente redirecione para o tema. 
              
              Pergunta do usuário: ${text}`
            }]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error && error.error.status === 'RESOURCE_EXHAUSTED') {
        alert('⚠️ Limite de requisições atingido. Tente novamente mais tarde.');
      } else {
        alert('❌ Erro ao conectar com a IA. Verifique sua API Key.');
      }
      removeTypingIndicator();
      return;
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;

    // Remover animação de digitando
    removeTypingIndicator();

    // Adicionar resposta da IA
    currentMessages.push({ role: 'model', text: aiText });
    saveCurrentChat();
    renderMessages();

  } catch (err) {
    console.error(err);
    removeTypingIndicator();
    alert('Erro de conexão. Verifique sua internet e API Key.');
  }
}

function showTypingIndicator() {
  const container = document.getElementById('messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message-ai';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="bubble bubble-ai flex items-center">
      <span class="typing"></span>
      <span class="typing"></span>
      <span class="typing"></span>
    </div>
  `;
  container.appendChild(typingDiv);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function saveCurrentChat() {
  if (!chatHistory[currentChatId]) {
    chatHistory[currentChatId] = { title: 'Nova conversa', messages: [] };
  }
  chatHistory[currentChatId].messages = currentMessages;
  if (currentMessages.length > 0 && !chatHistory[currentChatId].title) {
    chatHistory[currentChatId].title = currentMessages[0].text;
  }
  saveChats();
}

function saveChats() {
  localStorage.setItem('carAssistChats', JSON.stringify(chatHistory));
}