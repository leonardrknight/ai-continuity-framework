/**
 * Guardian Chat UI — Client-side application
 *
 * Handles Supabase Auth, conversation management, and chat messaging.
 * No frameworks — vanilla JS with Supabase CDN client.
 */

(function () {
  'use strict';

  // ─── State ───
  let supabase = null;
  let session = null;
  let conversations = [];
  let activeConversationId = null;
  let isSending = false;

  // ─── DOM References ───
  const authScreen = document.getElementById('auth-screen');
  const chatScreen = document.getElementById('chat-screen');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authSubmit = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');
  const authTabs = document.querySelectorAll('.auth-tab');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const conversationList = document.getElementById('conversation-list');
  const newChatBtn = document.getElementById('new-chat-btn');
  const userEmailEl = document.getElementById('user-email');
  const logoutBtn = document.getElementById('logout-btn');
  const chatTitle = document.getElementById('chat-title');
  const messagesContainer = document.getElementById('messages-container');
  const emptyState = document.getElementById('empty-state');
  const typingIndicator = document.getElementById('typing-indicator');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');

  let authMode = 'login'; // 'login' | 'signup'

  // ─── Init ───

  async function init() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Failed to load config');
      const config = await res.json();

      supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

      // Check for existing session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        session = data.session;
        showChat();
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, newSession) => {
        session = newSession;
        if (session) {
          showChat();
        } else {
          showAuth();
        }
      });
    } catch (err) {
      console.error('Init failed:', err);
      showAuthError('Failed to connect. Please refresh.');
    }

    bindEvents();
  }

  // ─── Auth ───

  function bindEvents() {
    // Auth tabs
    authTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        authMode = tab.dataset.tab;
        authTabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === authMode));
        authSubmit.textContent = authMode === 'login' ? 'Log in' : 'Sign up';
        authPassword.autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
        showAuthError('');
      });
    });

    // Auth form submit
    authForm.addEventListener('submit', handleAuth);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // New conversation
    newChatBtn.addEventListener('click', startNewConversation);

    // Send message
    sendBtn.addEventListener('click', handleSend);

    // Message input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleInputKeydown);

    // Mobile sidebar
    mobileMenuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Escape to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  async function handleAuth(e) {
    e.preventDefault();
    showAuthError('');
    authSubmit.disabled = true;

    const email = authEmail.value.trim();
    const password = authPassword.value;

    try {
      let result;
      if (authMode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) {
        showAuthError(result.error.message);
      } else if (authMode === 'signup' && result.data.user && !result.data.session) {
        showAuthError('Check your email to confirm your account.');
      }
    } catch (err) {
      showAuthError('An unexpected error occurred.');
    } finally {
      authSubmit.disabled = false;
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    session = null;
    conversations = [];
    activeConversationId = null;
    showAuth();
  }

  function showAuthError(msg) {
    authError.textContent = msg || '';
  }

  // ─── Screen Switching ───

  function showAuth() {
    authScreen.style.display = 'flex';
    chatScreen.classList.remove('visible');
    authForm.reset();
    showAuthError('');
  }

  function showChat() {
    authScreen.style.display = 'none';
    chatScreen.classList.add('visible');
    userEmailEl.textContent = session?.user?.email || '';
    loadConversations();
  }

  // ─── Conversations ───

  async function loadConversations() {
    try {
      const res = await apiFetch('/api/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      conversations = data.conversations || [];
      renderConversationList();
    } catch (err) {
      console.error('Load conversations failed:', err);
    }
  }

  function renderConversationList() {
    conversationList.innerHTML = '';

    if (conversations.length === 0) {
      conversationList.innerHTML =
        '<div style="padding: 1rem; color: var(--text-muted); font-size: 0.8rem; text-align: center;">No conversations yet</div>';
      return;
    }

    conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = 'conversation-item' + (conv.id === activeConversationId ? ' active' : '');
      item.dataset.id = conv.id;

      const title = document.createElement('div');
      title.className = 'conversation-item-title';
      title.textContent = conv.title || 'Untitled';

      const meta = document.createElement('div');
      meta.className = 'conversation-item-meta';
      meta.textContent = formatRelativeTime(conv.updated_at || conv.created_at);

      item.appendChild(title);
      item.appendChild(meta);

      item.addEventListener('click', () => {
        selectConversation(conv.id);
        closeSidebar();
      });

      conversationList.appendChild(item);
    });
  }

  async function selectConversation(id) {
    activeConversationId = id;
    renderConversationList();

    const conv = conversations.find((c) => c.id === id);
    chatTitle.textContent = conv?.title || 'Guardian';

    // Load messages
    try {
      const res = await apiFetch('/api/conversations/' + id);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      renderMessages(data.messages || []);
    } catch (err) {
      console.error('Load messages failed:', err);
    }
  }

  function startNewConversation() {
    activeConversationId = null;
    chatTitle.textContent = 'New conversation';
    clearMessages();
    closeSidebar();
    messageInput.focus();
  }

  // ─── Messages ───

  function renderMessages(messages) {
    clearMessages();
    if (messages.length === 0) return;

    emptyState.style.display = 'none';
    messages.forEach((msg) => appendMessage(msg.role, msg.content));
    scrollToBottom();
  }

  function clearMessages() {
    // Remove all messages but keep empty state
    const msgElements = messagesContainer.querySelectorAll('.message');
    msgElements.forEach((el) => el.remove());
    emptyState.style.display = 'flex';
  }

  function appendMessage(role, content) {
    emptyState.style.display = 'none';

    const msgEl = document.createElement('div');
    msgEl.className = 'message ' + role;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'assistant' ? 'G' : 'U';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;

    msgEl.appendChild(avatar);
    msgEl.appendChild(bubble);

    messagesContainer.appendChild(msgEl);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  function showTyping() {
    typingIndicator.classList.add('visible');
    scrollToBottom();
  }

  function hideTyping() {
    typingIndicator.classList.remove('visible');
  }

  // ─── Send Message ───

  async function handleSend() {
    const text = messageInput.value.trim();
    if (!text || isSending) return;

    isSending = true;
    sendBtn.disabled = true;
    messageInput.value = '';
    autoResize();

    appendMessage('user', text);
    showTyping();

    try {
      const body = { message: text };
      if (activeConversationId) {
        body.conversation_id = activeConversationId;
      }

      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      hideTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        appendMessage('assistant', 'Error: ' + (err.error || 'Something went wrong.'));
        return;
      }

      const data = await res.json();

      // If this was a new conversation, update state
      if (!activeConversationId && data.conversation_id) {
        activeConversationId = data.conversation_id;
        await loadConversations();
        // Update active highlight
        renderConversationList();
        const conv = conversations.find((c) => c.id === activeConversationId);
        chatTitle.textContent = conv?.title || 'Guardian';
      }

      appendMessage('assistant', data.response);
    } catch (err) {
      hideTyping();
      appendMessage('assistant', 'Error: Failed to send message. Please try again.');
      console.error('Send failed:', err);
    } finally {
      isSending = false;
      updateSendButton();
      messageInput.focus();
    }
  }

  // ─── Input Handling ───

  function handleInputChange() {
    updateSendButton();
    autoResize();
  }

  function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function updateSendButton() {
    sendBtn.disabled = !messageInput.value.trim() || isSending;
  }

  function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
  }

  // ─── Mobile Sidebar ───

  function closeSidebar() {
    sidebar.classList.remove('open');
  }

  // ─── API Helper ───

  async function apiFetch(url, options = {}) {
    const token = session?.access_token;
    const headers = {
      ...(options.headers || {}),
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return fetch(url, { ...options, headers });
  }

  // ─── Utilities ───

  function formatRelativeTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ─── Start ───
  init();
})();
