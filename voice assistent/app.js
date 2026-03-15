/* ══════════════════════════════════════════════════════════
   LUMINA AI — Voice Assistant Logic
   Features: Voice I/O · Streaming API · Page Context · UI
   ══════════════════════════════════════════════════════════ */

// ── DOM References ──────────────────────────────────────
const aiTrigger       = document.getElementById("aiTrigger");
const aiPanel         = document.getElementById("aiPanel");
const aiMessages      = document.getElementById("aiMessages");
const aiInput         = document.getElementById("aiInput");
const sendBtn         = document.getElementById("sendBtn");
const micBtn          = document.getElementById("micBtn");
const closePanelBtn   = document.getElementById("closePanelBtn");
const clearChatBtn    = document.getElementById("clearChatBtn");
const voiceVisualizer = document.getElementById("voiceVisualizer");
const aiStatus        = document.getElementById("aiStatus");
const quickActions    = document.getElementById("quickActions");

// ── State ────────────────────────────────────────────────
let isPanelOpen     = false;
let isListening     = false;
let isThinking      = false;
let recognition     = null;
let synth           = window.speechSynthesis;
let hasGreeted      = false;

// ── Panel Toggle ─────────────────────────────────────────
function togglePanel() {
  isPanelOpen = !isPanelOpen;
  aiPanel.classList.toggle("open", isPanelOpen);
  aiTrigger.classList.toggle("open", isPanelOpen);

  if (isPanelOpen) {
    aiInput.focus();
    scrollToBottom();

    // Proactive suggestion on first open
    if (!hasGreeted) {
      hasGreeted = true;
      setTimeout(() => {
        proactiveAnalysisSuggestion();
      }, 1200);
    }
  }
}

aiTrigger.addEventListener("click", togglePanel);
closePanelBtn.addEventListener("click", () => {
  isPanelOpen = false;
  aiPanel.classList.remove("open");
  aiTrigger.classList.remove("open");
});

// ── Quick Action Buttons ──────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("quick-btn")) {
    const query = e.target.getAttribute("data-query");
    if (query) sendMessage(query);
  }
});

// ── Clear Chat ────────────────────────────────────────────
clearChatBtn.addEventListener("click", () => {
  // Keep only the welcome message
  const welcome = document.getElementById("welcomeMessage");
  aiMessages.innerHTML = "";
  if (welcome) aiMessages.appendChild(welcome);

  // Re-add quick actions if they were removed
  const qa = document.getElementById("quickActions");
  if (!qa) {
    const welcomeBubble = welcome?.querySelector(".message-bubble");
    if (welcomeBubble) {
      const newQA = createQuickActions();
      welcomeBubble.appendChild(newQA);
    }
  }
});

function createQuickActions() {
  const div = document.createElement("div");
  div.className = "quick-actions";
  div.id = "quickActions";
  const btns = [
    ["🔍 Analyze Page", "Analyze this page and give me UX improvement suggestions"],
    ["🚀 Boost Conversions", "What product improvements would increase conversions?"],
    ["⚠️ Find UX Issues", "What are the top 3 UX issues on this page?"],
    ["🧭 Fix Navigation", "How can I improve the navigation on this website?"]
  ];
  btns.forEach(([label, query]) => {
    const btn = document.createElement("button");
    btn.className = "quick-btn";
    btn.setAttribute("data-query", query);
    btn.textContent = label;
    div.appendChild(btn);
  });
  return div;
}

// ── Proactive Suggestion ──────────────────────────────────
function proactiveAnalysisSuggestion() {
  if (aiMessages.querySelectorAll(".ai-message").length > 1) return;
  addAIMessage("💡 Would you like me to **analyze this page** and give you actionable improvement suggestions?", false);
}

// ── Page Context Capture ──────────────────────────────────
function capturePageContext() {
  const url   = window.location.href;
  const title = document.title;

  // Get visible text content, exclude the AI panel itself
  const body  = document.body.cloneNode(true);
  const panel = body.querySelector(".ai-panel");
  const trigger = body.querySelector(".ai-trigger");
  if (panel) panel.remove();
  if (trigger) trigger.remove();
  const text = body.innerText
    .replace(/\s{3,}/g, "\n\n")
    .trim()
    .slice(0, 3000);

  return { url, title, text };
}

// ── Message Rendering ─────────────────────────────────────
function addUserMessage(text) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const div = document.createElement("div");
  div.className = "message user-message";
  div.innerHTML = `
    <div class="message-bubble">${escapeHtml(text)}</div>
    <span class="message-time">${now}</span>
  `;
  aiMessages.appendChild(div);
  scrollToBottom();
  return div;
}

function addAIMessage(text, withAnimation = true) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const div = document.createElement("div");
  div.className = "message ai-message";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = renderMarkdown(text);
  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = now;
  div.appendChild(bubble);
  div.appendChild(time);
  aiMessages.appendChild(div);
  scrollToBottom();
  return { div, bubble };
}

function addTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message ai-message";
  div.id = "typingIndicator";
  div.innerHTML = `
    <div class="message-bubble">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  aiMessages.appendChild(div);
  scrollToBottom();
  return div;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

// ── Simple Markdown Renderer ──────────────────────────────
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n+/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)/gm, (m) => m.trim() ? m : "")
    .replace(/\n/g, "<br/>");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Scroll ────────────────────────────────────────────────
function scrollToBottom(smooth = true) {
  setTimeout(() => {
    aiMessages.scrollTo({ top: aiMessages.scrollHeight, behavior: smooth ? "smooth" : "instant" });
  }, 50);
}

// ── Status Indicator ──────────────────────────────────────
function setStatus(text, color = "#22c55e") {
  aiStatus.innerHTML = `<span class="status-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span> ${text}`;
}

// ── Send Message (Core) ───────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text || isThinking) return;

  // Remove quick actions after first use
  const qa = document.getElementById("quickActions");
  if (qa) qa.remove();

  addUserMessage(text);
  aiInput.value = "";
  autoResizeTextarea();

  isThinking = true;
  sendBtn.disabled = true;
  setStatus("Thinking…", "#f59e0b");

  const typingEl = addTypingIndicator();
  const pageContext = capturePageContext();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, page_context: pageContext })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    removeTypingIndicator();

    // Streaming response
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai-message";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble streaming-cursor";
    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = now;
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(timeSpan);
    aiMessages.appendChild(messageDiv);
    scrollToBottom();

    let fullText = "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    setStatus("Responding…", "#8b5cf6");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const obj = JSON.parse(data);
          if (obj.content) {
            fullText += obj.content;
            bubble.innerHTML = renderMarkdown(fullText);
            scrollToBottom(false);
          }
          if (obj.error) throw new Error(obj.error);
        } catch (e) {
          // skip malformed chunk
        }
      }
    }

    bubble.classList.remove("streaming-cursor");
    bubble.innerHTML = renderMarkdown(fullText);

    // Text-to-speech
    speakText(fullText);

  } catch (error) {
    removeTypingIndicator();
    addAIMessage(`❌ Oops! I couldn't connect to the AI. Please make sure the server is running. *(${error.message})*`);
    console.error("Chat error:", error);
  } finally {
    isThinking = false;
    sendBtn.disabled = false;
    setStatus("Online", "#22c55e");
    scrollToBottom();
  }
}

// ── Send Button & Enter Key ───────────────────────────────
sendBtn.addEventListener("click", () => sendMessage(aiInput.value));

aiInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(aiInput.value);
  }
});

aiInput.addEventListener("input", autoResizeTextarea);
function autoResizeTextarea() {
  aiInput.style.height = "auto";
  aiInput.style.height = Math.min(aiInput.scrollHeight, 100) + "px";
}

// ── Voice Recognition ─────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="9" y="2" width="6" height="12" rx="3"/>
        <path d="M5 10a7 7 0 0 0 14 0"/>
        <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2.5"/>
      </svg>
      <span>Stop</span>`;
    voiceVisualizer.classList.add("active");
    setStatus("Listening…", "#8b5cf6");
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join("");
    aiInput.value = transcript;
    autoResizeTextarea();

    if (e.results[e.results.length - 1].isFinal) {
      stopListening();
      sendMessage(transcript);
    }
  };

  recognition.onerror = (e) => {
    stopListening();
    if (e.error !== "aborted") {
      addAIMessage(`🎤 Microphone error: *${e.error}*. Please check your browser permissions.`);
    }
  };

  recognition.onend = () => {
    if (isListening) stopListening();
  };
} else {
  micBtn.disabled = true;
  micBtn.title = "Speech recognition not supported in this browser. Please use Chrome.";
  micBtn.style.opacity = "0.4";
}

function startListening() {
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    console.warn("Recognition already started");
  }
}

function stopListening() {
  isListening = false;
  micBtn.classList.remove("listening");
  micBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.08A7 7 0 0 0 19 10z"/>
    </svg>
    <span>Speak</span>`;
  voiceVisualizer.classList.remove("active");
  setStatus("Online", "#22c55e");
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
}

micBtn.addEventListener("click", () => {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

// ── Text-to-Speech ────────────────────────────────────────
function speakText(text) {
  if (!synth) return;
  synth.cancel();

  // Strip markdown for TTS
  const clean = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[🔍🚀⚠️🧭💡❌🎤📱🎧💻⌚📷🎮⚡👋]/g, "")
    .trim();

  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  utterance.volume = 0.9;

  // Try to find a good English voice
  const voices = synth.getVoices();
  const preferred = voices.find(v =>
    v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Alex"))
  ) || voices.find(v => v.lang.startsWith("en"));
  if (preferred) utterance.voice = preferred;

  synth.speak(utterance);
}

// Ensure voices are loaded
if (synth && synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = () => { synth.getVoices(); };
}

// ══════════════════════════════════════════════════════════
//  DEMO PAGE INTERACTIVITY
// ══════════════════════════════════════════════════════════

// Add to Cart buttons
document.querySelectorAll(".add-to-cart").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const original = btn.textContent;
    btn.textContent = "✓ Added!";
    btn.classList.add("added");
    const badge = document.querySelector(".cart-badge");
    if (badge) badge.textContent = Number(badge.textContent) + 1;

    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("added");
    }, 2000);
  });
});

// Filter tabs
document.querySelectorAll(".filter-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
  });
});

// Countdown timer
function startCountdown() {
  let totalSeconds = 8 * 3600 + 34 * 60 + 12;

  const hoursEl   = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");

  const interval = setInterval(() => {
    if (totalSeconds <= 0) { clearInterval(interval); return; }
    totalSeconds--;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (hoursEl)   hoursEl.textContent   = String(h).padStart(2, "0");
    if (minutesEl) minutesEl.textContent = String(m).padStart(2, "0");
    if (secondsEl) secondsEl.textContent = String(s).padStart(2, "0");
  }, 1000);
}
startCountdown();

// Navbar scroll effect
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (navbar) {
    if (window.scrollY > 20) {
      navbar.style.borderBottomColor = "rgba(139,92,246,0.2)";
    } else {
      navbar.style.borderBottomColor = "rgba(255,255,255,0.08)";
    }
  }
});

// ── Init ──────────────────────────────────────────────────
console.log(
  "%c⚡ Lumina AI Voice Assistant ready",
  "color: #8b5cf6; font-size: 14px; font-weight: bold;"
);
