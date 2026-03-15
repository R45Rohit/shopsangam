/* ═══════════════════════════════════════════════════════
   SMART RETAIL — Seller Workflow JS
   Features: Screen nav · OTP timer · Language · Voice · AI sim
   ═══════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────
const state = {
  currentScreen: 'screen-splash',
  selectedLang:  'en',
  sellerType:    null,
  isListening:   false,
  recognition:   null,
  synth:         window.speechSynthesis,
  otpTimer:      null,
};

// ── Screen Navigation ─────────────────────────────────────
function showScreen(nextId, direction = 'forward') {
  const current = document.getElementById(state.currentScreen);
  const next    = document.getElementById(nextId);
  if (!next || nextId === state.currentScreen) return;

  // Animate out current
  current.classList.add('slide-out');
  current.classList.remove('active');

  // Animate in next (small delay for CSS transition)
  setTimeout(() => {
    current.classList.remove('slide-out');
    current.style.display = '';
    next.classList.add('active');
    next.scrollTop = 0;
    state.currentScreen = nextId;

    // Trigger per-screen setup
    setupScreen(nextId);
  }, 120);
}

// ── Global Click Delegation ───────────────────────────────
document.addEventListener('click', e => {
  const el = e.target.closest('[data-next]');
  if (el) { showScreen(el.dataset.next); return; }

  const back = e.target.closest('[data-back]');
  if (back) { showScreen(back.dataset.back, 'back'); return; }

  // Tip action links that have data-next
  if (e.target.classList.contains('tip-action') && e.target.dataset.next) {
    showScreen(e.target.dataset.next);
  }
});

// ── Per-Screen Setup ──────────────────────────────────────
function setupScreen(id) {
  switch (id) {
    case 'screen-language':  setupLanguage();   break;
    case 'screen-signup':    setupSignup();     break;
    case 'screen-seller-type': setupSellerType(); break;
    case 'screen-shop-setup':  setupShopSetup();  break;
    case 'screen-live':       setupLive();       break;
    case 'screen-ai-identify': setupAIIdentify(); break;
    case 'screen-demand':     pulseCards();      break;
  }
}

// ── Splash Screen ─────────────────────────────────────────
document.getElementById('btn-go-sell').addEventListener('click', () => showScreen('screen-language'));
document.getElementById('btn-go-buy').addEventListener('click', () => {
  window.location.href = 'index.html';
});

// ── Language Selection ────────────────────────────────────
function setupLanguage() {
  document.querySelectorAll('.lang-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      document.querySelectorAll('.lang-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      state.selectedLang = tile.dataset.lang;
      speakFeedback('Language selected: ' + tile.querySelector('.lang-name').textContent);
    });
  });
}

// ── Sign-Up & OTP ─────────────────────────────────────────
function setupSignup() {
  // Tab switching
  const tabPhone   = document.getElementById('tab-phone');
  const tabGoogle  = document.getElementById('tab-google');
  const phoneSection = document.getElementById('phone-section');
  const otpSection   = document.getElementById('otp-section');

  tabPhone?.addEventListener('click', () => {
    tabPhone.classList.add('active');
    tabGoogle.classList.remove('active');
    phoneSection.style.display = 'flex';
    phoneSection.style.flexDirection = 'column';
    phoneSection.style.gap = '14px';
  });
  tabGoogle?.addEventListener('click', () => {
    tabGoogle.classList.add('active');
    tabPhone.classList.remove('active');
    phoneSection.style.display = 'none';
    otpSection.style.display = 'none';
  });

  // Send OTP
  document.getElementById('btn-send-otp')?.addEventListener('click', () => {
    const num = document.getElementById('phone-input')?.value;
    if (!num || num.length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }
    document.getElementById('otp-number').textContent = '+91 ' + num;
    phoneSection.style.display = 'none';
    otpSection.style.display = 'flex';
    otpSection.style.flexDirection = 'column';
    startOTPTimer();
    // Auto-focus first OTP box
    document.getElementById('otp1')?.focus();
  });

  // OTP box auto-advance
  ['otp1','otp2','otp3','otp4'].forEach((id, i, arr) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.addEventListener('input', () => {
      if (box.value.length >= 1 && i < arr.length - 1) {
        document.getElementById(arr[i + 1])?.focus();
      }
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && box.value === '' && i > 0) {
        document.getElementById(arr[i - 1])?.focus();
      }
    });
  });

  // Google login immediate nav
  document.getElementById('btn-google-login')?.addEventListener('click', () => {
    setTimeout(() => showScreen('screen-seller-type'), 300);
  });
}

function startOTPTimer() {
  clearInterval(state.otpTimer);
  let t = 30;
  const el = document.getElementById('otp-timer');
  state.otpTimer = setInterval(() => {
    t--;
    if (el) el.textContent = t > 0 ? `${t}s` : 'Resend now';
    if (t <= 0) clearInterval(state.otpTimer);
  }, 1000);
}

// ── Seller Type ───────────────────────────────────────────
function setupSellerType() {
  document.querySelectorAll('[data-type]').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-type]').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.sellerType = card.dataset.type;
    });
  });
}

// ── Shop Setup — Location Detect ─────────────────────────
function setupShopSetup() {
  const detectBtn  = document.getElementById('detect-location');
  const locText    = document.getElementById('location-text');

  detectBtn?.addEventListener('click', () => {
    locText.textContent = '⏳ Detecting…';
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { locText.textContent = '📍 Koramangala, Bengaluru'; },
        ()  => { locText.textContent = '📍 Koramangala, Bengaluru (default)'; }
      );
    } else {
      locText.textContent = '📍 Koramangala, Bengaluru (default)';
    }
  });

  // Voice shop name
  setupVoiceBtn('btn-shopname-voice', 'shop-name');
}

// ── Add Product Tabs ──────────────────────────────────────
document.getElementById('add-tab-photo')?.addEventListener('click', () => switchAddTab('photo'));
document.getElementById('add-tab-voice')?.addEventListener('click', () => switchAddTab('voice'));
document.getElementById('add-tab-manual')?.addEventListener('click', () => switchAddTab('manual'));

function switchAddTab(tab) {
  ['photo','voice','manual'].forEach(t => {
    const panel = document.getElementById('panel-' + t);
    const btn   = document.getElementById('add-tab-' + t);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn)   btn.classList.toggle('active', t === tab);
  });
}

// Trigger file input from upload area
document.getElementById('photo-upload-area')?.addEventListener('click', () => {
  document.getElementById('product-photo')?.click();
});

document.getElementById('product-photo')?.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) {
    const area = document.getElementById('photo-upload-area');
    const icon = area.querySelector('.photo-upload-icon');
    const text = area.querySelector('.photo-upload-text');
    icon.textContent = '✅';
    text.textContent = 'Photo selected! AI is reading it…';
    setTimeout(() => { text.textContent = '📸 Photo ready!'; }, 1200);
  }
});

// Voice describe product
document.getElementById('btn-voice-describe')?.addEventListener('click', () => {
  const btn    = document.getElementById('btn-voice-describe');
  const label  = document.getElementById('voice-desc-label');
  const transcriptEl = document.getElementById('voice-transcript');

  if (state.isListening) {
    stopVoice();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    transcriptEl.style.display = 'block';
    transcriptEl.textContent = '🎙️ "Fresh mango pickle with home spices, made in my kitchen"';
    label.textContent = 'Description captured!';
    return;
  }

  const rec = new SR();
  rec.lang = state.selectedLang === 'hi' ? 'hi-IN' : 'en-IN';
  rec.interimResults = true;
  rec.start();
  state.recognition = rec;
  state.isListening = true;
  btn.classList.add('listening');
  label.textContent = 'Listening... speak now!';

  rec.onresult = e => {
    const text = Array.from(e.results).map(r => r[0].transcript).join('');
    transcriptEl.style.display = 'block';
    transcriptEl.textContent = text;
    if (e.results[e.results.length - 1].isFinal) {
      stopVoice();
      label.textContent = '✅ Voice description captured!';
    }
  };
  rec.onerror = () => {
    stopVoice();
    transcriptEl.style.display = 'block';
    transcriptEl.textContent = '"Homemade mango pickle made fresh with pure spices"';
    label.textContent = 'Description captured!';
  };
  rec.onend = () => stopVoice();
});

function stopVoice() {
  state.isListening = false;
  if (state.recognition) { try { state.recognition.stop(); } catch(e) {} state.recognition = null; }
  const btn = document.getElementById('btn-voice-describe');
  if (btn) btn.classList.remove('listening');
}

// ── AI Identify Setup (simulate AI analysis) ──────────────
function setupAIIdentify() {
  // Simulate a loading flash
  const card = document.querySelector('.ai-suggestion-card');
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 200);
  }
}

// ── Live Screen — Animated customer counter ───────────────
function setupLive() {
  const el = document.getElementById('customer-counter');
  if (!el) return;
  let count = 0;
  const target = 2340;
  const step = Math.ceil(target / 60);
  const interval = setInterval(() => {
    count = Math.min(count + step, target);
    el.textContent = count.toLocaleString('en-IN');
    if (count >= target) clearInterval(interval);
  }, 20);
}

// ── Demand Cards — stagger-in animation ──────────────────
function pulseCards() {
  document.querySelectorAll('.demand-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 80);
  });
}

// ── Floating Voice Button ─────────────────────────────────
document.getElementById('float-voice-btn')?.addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('float-voice-btn');

  if (state.isListening) { stopVoice(); btn.textContent = '🎙️'; return; }

  if (!SR) {
    // Simulate voice command
    const cmds = {
      'screen-splash':      'Say: "Sell" or "Buy"',
      'screen-dashboard':   'Say: "Add product", "Messages", "Demand", or "Tips"',
      'screen-add-product': 'Say: "Take photo", "Voice", or "Manual"',
      'screen-demand':      'Say: "Add product" to list a trending item',
    };
    const hint = cmds[state.currentScreen] || 'Voice command activated!';
    showToast('🎙️ ' + hint);
    return;
  }

  const rec = new SR();
  rec.lang = state.selectedLang === 'hi' ? 'hi-IN' : 'en-IN';
  rec.start();
  state.recognition = rec;
  state.isListening = true;
  btn.textContent = '⏹️';

  rec.onresult = e => {
    const cmd = Array.from(e.results).map(r => r[0].transcript).join('').toLowerCase();
    handleVoiceCommand(cmd);
    stopVoice();
    btn.textContent = '🎙️';
  };
  rec.onerror = () => { stopVoice(); btn.textContent = '🎙️'; };
  rec.onend   = () => { stopVoice(); btn.textContent = '🎙️'; };
});

function handleVoiceCommand(cmd) {
  if (cmd.includes('sell') || cmd.includes('product') || cmd.includes('add'))
    showScreen('screen-add-product');
  else if (cmd.includes('demand') || cmd.includes('trend'))
    showScreen('screen-demand');
  else if (cmd.includes('message') || cmd.includes('chat'))
    showScreen('screen-messages');
  else if (cmd.includes('tip') || cmd.includes('help') || cmd.includes('grow'))
    showScreen('screen-tips');
  else if (cmd.includes('dashboard') || cmd.includes('home'))
    showScreen('screen-dashboard');
  else if (cmd.includes('price') || cmd.includes('pricing'))
    showScreen('screen-pricing');
  else
    showToast('🤖 Command not recognized. Try: "Add product", "Messages", "Demand"');
}

// ── Voice Ribbon (Language Screen) ───────────────────────
document.getElementById('btn-lang-voice')?.addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('🎙️ Say your language name!'); return; }

  const rec = new SR();
  rec.lang = 'en-IN';
  rec.start();
  rec.onresult = e => {
    const heard = Array.from(e.results).map(r => r[0].transcript).join('').toLowerCase();
    const langMap = { hindi: 'hi', tamil: 'ta', telugu: 'te', kannada: 'kn', marathi: 'mr', gujarati: 'gu', bengali: 'bn', punjabi: 'pa', english: 'en' };
    for (const [name, code] of Object.entries(langMap)) {
      if (heard.includes(name)) {
        document.querySelectorAll('.lang-tile').forEach(t => t.classList.remove('selected'));
        const tile = document.querySelector(`.lang-tile[data-lang="${code}"]`);
        if (tile) { tile.classList.add('selected'); state.selectedLang = code; }
        showToast(`✅ ${name.charAt(0).toUpperCase() + name.slice(1)} selected!`);
        return;
      }
    }
    showToast('🎙️ Not recognized. Please try again or tap a language tile.');
  };
});

// ── Generic Voice → Input helper ─────────────────────────
function setupVoiceBtn(btnId, inputId) {
  const btn   = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('🎙️ Speak your shop name!'); return; }
    const rec = new SR();
    rec.lang = state.selectedLang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.start();
    rec.onresult = e => {
      const text = Array.from(e.results).map(r => r[0].transcript).join('');
      input.value = text;
    };
  });
}

// ── Voice Reply in Messages ───────────────────────────────
document.getElementById('btn-voice-reply')?.addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('btn-voice-reply');

  if (!SR) {
    const ta = document.querySelector('.chat-messages ~ div textarea');
    if (ta) ta.value = 'Yes, I can deliver. Will reach you by 6 PM today!';
    showToast('🎙️ Voice reply captured!');
    return;
  }

  const rec = new SR();
  rec.lang = state.selectedLang === 'hi' ? 'hi-IN' : 'en-IN';
  rec.start();
  btn.style.background = 'linear-gradient(135deg,#ef4444,#f97316)';
  rec.onresult = e => {
    const text = Array.from(e.results).map(r => r[0].transcript).join('');
    const ta = document.querySelector('#screen-messages textarea');
    if (ta) ta.value = text;
  };
  rec.onend = () => { btn.style.background = ''; };
});

// ── TTS ───────────────────────────────────────────────────
function speakFeedback(text) {
  if (!state.synth) return;
  state.synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 0.8;
  const voices = state.synth.getVoices();
  const pref = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
  if (pref) utt.voice = pref;
  state.synth.speak(utt);
}

// ── Toast Notification ────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('sr-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sr-toast';
    toast.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
      background:rgba(27,67,50,0.92); color:white; padding:12px 20px;
      border-radius:30px; font-size:14px; font-weight:600; z-index:9999;
      backdrop-filter:blur(12px); box-shadow:0 8px 24px rgba(0,0,0,0.3);
      pointer-events:none; max-width:340px; text-align:center;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}

// ── Dashboard Tile Nav ────────────────────────────────────
['btn-dash-add','btn-dash-demand','btn-dash-messages','btn-dash-tips'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function() {
    showScreen(this.dataset.next);
  });
});

// ── Init ──────────────────────────────────────────────────
if (state.synth?.onvoiceschanged !== undefined) {
  state.synth.onvoiceschanged = () => state.synth.getVoices();
}

// Preload screen-splash as active (already in HTML)
state.currentScreen = 'screen-splash';

console.log('%c🛍️ SmartRetail Seller Workflow Ready', 'color:#FF6B35;font-size:14px;font-weight:bold;');
