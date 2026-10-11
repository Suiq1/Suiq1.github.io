const canvas = document.getElementById('comet-canvas');
const ctx = canvas.getContext('2d');
const apiBaseUrl = (window.QWEN_API_BASE_URL || '').replace(/\/$/, '');

const params = {
  speedMin: 260,
  speedMax: 420,
  lengthMin: 82,
  lengthMax: 180,
  opacityMin: 0.32,
  opacityMax: 0.72,
};

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let meteors = [];
let stars = [];
let lastTime = performance.now();

function meteorCountForViewport() {
  return Math.min(9, Math.max(4, Math.round((width * height) / 150000)));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function starCountForViewport() {
  // The galaxy image supplies the dense star field; these are the moving,
  // twinkling foreground stars layered above it.
  return Math.min(520, Math.max(220, Math.round((width * height) / 9000)));
}

function gaussianOffset() {
  return (
    Math.random() + Math.random() + Math.random() +
    Math.random() + Math.random() + Math.random() - 3
  );
}

function randomStarY(xRatio) {
  if (Math.random() >= 0.68) return randomRange(0, height);

  const bandCenter = height * (0.48 - (xRatio - 0.5) * 0.25);
  return bandCenter + gaussianOffset() * height * 0.12;
}

function createStar() {
  const x = randomRange(0, width);
  return {
    x,
    y: randomStarY(x / Math.max(1, width)),
    radius: randomRange(0.35, 1.4),
    driftX: randomRange(-8, 8),
    driftY: randomRange(-3, 5),
    opacity: randomRange(0.28, 0.92),
    twinkle: randomRange(0.65, 1.8),
    phase: randomRange(0, Math.PI * 2),
    hue: Math.random() < 0.16 ? 'warm' : 'cool',
  };
}

function syncStarCount() {
  const targetCount = starCountForViewport();
  while (stars.length < targetCount) {
    stars.push(createStar());
  }
  if (stars.length > targetCount) {
    stars.length = targetCount;
  }
}

function updateStars(dt) {
  for (const star of stars) {
    star.x += star.driftX * dt;
    star.y += star.driftY * dt;

    if (star.y > height + 2) star.y = -2;
    if (star.x < -2) star.x = width + 2;
    if (star.x > width + 2) star.x = -2;
  }
}

function drawStars(now) {
  ctx.globalCompositeOperation = 'source-over';

  for (const star of stars) {
    const time = now * 0.001;
    const primaryWave = Math.sin(time * star.twinkle + star.phase);
    const secondaryWave = Math.sin(time * star.twinkle * 1.73 + star.phase * 0.61);
    const shimmer = Math.max(0.16, Math.min(1.42, 0.72 + primaryWave * 0.4 + secondaryWave * 0.18));
    const brightness = star.opacity * shimmer;
    const color = star.hue === 'warm' ? '255, 232, 196' : '210, 231, 255';

    ctx.fillStyle = `rgba(${color}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();

    // A small diffraction glint makes the brightest stars visibly twinkle.
    if (star.radius > 0.78 && shimmer > 0.96) {
      const glint = Math.min(0.42, (shimmer - 0.96) * 0.9);
      const ray = star.radius * (3.2 + shimmer * 1.8);
      ctx.strokeStyle = `rgba(${color}, ${glint})`;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(star.x - ray, star.y);
      ctx.lineTo(star.x + ray, star.y);
      ctx.moveTo(star.x, star.y - ray);
      ctx.lineTo(star.x, star.y + ray);
      ctx.stroke();
    }
  }
}

function createMeteor(initial = false) {
  // Meteors arrive from a broad radiant rather than following one fixed line.
  const angle = randomRange(Math.PI * 0.28, Math.PI * 0.82);
  const initialSpeed = randomRange(params.speedMin, params.speedMax);
  const length = randomRange(params.lengthMin, params.lengthMax);
  const lifetime = randomRange(1.15, 2.2);
  const fromSide = Math.random() < 0.28;
  const movingRight = Math.cos(angle) > 0;
  let x;
  let y;

  if (fromSide && movingRight) {
    x = -length;
    y = randomRange(-length, height * 0.62);
  } else if (fromSide) {
    x = width + length;
    y = randomRange(-length, height * 0.62);
  } else {
    x = randomRange(-length, width + length);
    y = -length;
  }

  const age = initial ? randomRange(0, lifetime * 0.75) : 0;

  return {
    x: x + Math.cos(angle) * initialSpeed * age,
    y: y + Math.sin(angle) * initialSpeed * age,
    length,
    speed: initialSpeed,
    acceleration: randomRange(80, 180),
    drag: randomRange(0.05, 0.16),
    angle,
    age,
    lifetime,
    mass: randomRange(0.72, 1.2),
    coreSize: randomRange(1.8, 3.8),
    opacity: randomRange(params.opacityMin, params.opacityMax),
    lineWidth: randomRange(0.7, 1.5),
    wakePhase: randomRange(0, Math.PI * 2),
    hue: Math.random() < 0.76 ? 'cool' : 'neutral',
  };
}

function resetMeteor(meteor) {
  Object.assign(meteor, createMeteor(false));
}

function syncMeteorCount() {
  const targetCount = meteorCountForViewport();
  while (meteors.length < targetCount) {
    meteors.push(createMeteor(true));
  }
  if (meteors.length > targetCount) {
    meteors.length = targetCount;
  }
}

function updateMeteors(dt) {
  for (const meteor of meteors) {
    meteor.age += dt;

    const progress = meteor.age / meteor.lifetime;
    const atmosphere = Math.max(0, Math.min(1, (progress - 0.08) / 0.82));
    meteor.speed += meteor.acceleration * (1 - atmosphere * 0.7) * dt;
    meteor.speed *= Math.max(0, 1 - meteor.drag * atmosphere * dt);
    meteor.mass -= (0.08 + atmosphere * 0.22) * dt;
    meteor.x += Math.cos(meteor.angle) * meteor.speed * dt;
    meteor.y += Math.sin(meteor.angle) * meteor.speed * dt;

    if (
      meteor.age >= meteor.lifetime ||
      meteor.mass <= 0.45 ||
      meteor.x < -meteor.length ||
      meteor.y > height + meteor.length
    ) {
      resetMeteor(meteor);
    }
  }
}

function drawMeteors() {
  // Screen blending lets the blue galaxy show through the meteor glow.
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.78;

  for (const meteor of meteors) {
    const progress = Math.max(0, Math.min(1, meteor.age / meteor.lifetime));
    const atmosphere = Math.max(0, Math.min(1, (progress - 0.08) / 0.82));
    const heating = smoothstep(0.05, 0.35, progress);
    const burnout = 1 - smoothstep(0.72, 1, progress);
    const visibility = smoothstep(0, 0.08, progress) * (1 - smoothstep(0.96, 1, progress));
    const glow = heating * burnout;
    const headX = meteor.x;
    const headY = meteor.y;
    // The ionized trail grows as the body heats up, then thins during burnout.
    const tailLength = meteor.length * (0.34 + glow * (1.05 + atmosphere * 1.7));
    const tailX = headX - Math.cos(meteor.angle) * tailLength;
    const tailY = headY - Math.sin(meteor.angle) * tailLength;
    const alpha = meteor.opacity * visibility * (0.05 + glow * 0.62);
    const plumeColor = meteor.hue === 'cool' ? '150, 202, 255' : '194, 211, 255';

    const haloRadius = meteor.coreSize * (2.2 + glow * 7.2);
    const halo = ctx.createRadialGradient(headX, headY, 0, headX, headY, haloRadius);
    halo.addColorStop(0, `rgba(244, 250, 255, ${alpha * 0.68})`);
    halo.addColorStop(0.24, `rgba(${plumeColor}, ${alpha * 0.3})`);
    halo.addColorStop(0.58, `rgba(255, 224, 190, ${alpha * 0.08})`);
    halo.addColorStop(1, 'rgba(145, 190, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(headX, headY, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(headX, headY, tailX, tailY);
    gradient.addColorStop(0, `rgba(238, 248, 255, ${alpha * 0.82})`);
    gradient.addColorStop(0.1, `rgba(210, 234, 255, ${alpha * 0.68})`);
    gradient.addColorStop(0.36, `rgba(${plumeColor}, ${alpha * 0.28})`);
    gradient.addColorStop(0.72, `rgba(115, 160, 255, ${alpha * 0.09})`);
    gradient.addColorStop(1, 'rgba(115, 160, 255, 0)');

    const bend = Math.sin(meteor.age * 2.2 + meteor.wakePhase) * (2 + tailLength * 0.018);
    const controlX = (headX + tailX) / 2 + Math.cos(meteor.angle + Math.PI / 2) * bend;
    const controlY = (headY + tailY) / 2 + Math.sin(meteor.angle + Math.PI / 2) * bend;

    // A soft atmospheric envelope sits under the narrow hot trail.
    ctx.save();
    ctx.filter = `blur(${2 + glow * 2.2}px)`;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = meteor.lineWidth * (2.3 + glow * 3.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.quadraticCurveTo(controlX, controlY, tailX, tailY);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = gradient;
    ctx.lineWidth = meteor.lineWidth * (0.3 + glow * 0.55);
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.quadraticCurveTo(controlX, controlY, tailX, tailY);
    ctx.stroke();

    const coreSize = meteor.coreSize * (1 - atmosphere * 0.38);
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(meteor.angle);
    ctx.fillStyle = `rgba(35, 38, 45, ${visibility * (1 - glow * 0.9) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, coreSize * 1.35, coreSize, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(243, 249, 255, ${alpha * 0.82})`;
    ctx.beginPath();
    ctx.ellipse(coreSize * 0.72, -coreSize * 0.18, coreSize * 0.45, coreSize * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (glow > 0.45) {
      const fragmentCount = 2 + Math.floor(glow * 3);
      for (let index = 0; index < fragmentCount; index += 1) {
        const fragmentProgress = 0.3 + index * 0.17;
        const offset = tailLength * fragmentProgress;
        const wobble = Math.sin(meteor.age * (7 + index) + index * 2.4) * (2 + index);
        const fragmentX = headX - Math.cos(meteor.angle) * offset + Math.cos(meteor.angle + Math.PI / 2) * wobble;
        const fragmentY = headY - Math.sin(meteor.angle) * offset + Math.sin(meteor.angle + Math.PI / 2) * wobble;
        ctx.fillStyle = `rgba(${plumeColor}, ${alpha * (0.16 - index * 0.02)})`;
        ctx.beginPath();
        ctx.arc(fragmentX, fragmentY, Math.max(0.45, meteor.coreSize * (0.28 - index * 0.035)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function smoothstep(edge0, edge1, value) {
  const normalized = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return normalized * normalized * (3 - 2 * normalized);
}

function step(now) {
  const dt = Math.max(0.001, Math.min(0.033, (now - lastTime) / 1000));
  lastTime = now;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The canvas is transparent over the static star image. Clear it fully so
  // expired meteor trails cannot accumulate into dark diagonal bands.
  ctx.clearRect(0, 0, width, height);

  syncStarCount();
  updateStars(dt);
  syncMeteorCount();
  updateMeteors(dt);
  drawMeteors();
  drawStars(now);
  requestAnimationFrame(step);
}

function createQuestionBox() {
  const chatForm = document.getElementById('chat-form');
  const chatHistory = document.getElementById('chat-history');
  const input = document.getElementById('question-input');
  const replyButton = document.getElementById('reply-button');
  const storageKey = 'meteor-wish-chat-history-v1';
  let messages = loadMessages();

  function scrollChatToBottom() {
    requestAnimationFrame(() => {
      chatHistory.scrollTop = chatHistory.scrollHeight;
    });
  }

  function saveMessages() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {
      // Private browsing can disable localStorage; the current chat still works.
    }
  }

  function loadMessages() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved
        .filter((message) => (
          (message?.role === 'user' || message?.role === 'assistant') &&
          typeof message.content === 'string' &&
          message.content.trim()
        ))
        .slice(-40);
    } catch {
      return [];
    }
  }

  function renderMessage(role, content) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;
    row.appendChild(bubble);
    chatHistory.appendChild(row);
    return row;
  }

  function renderHistory() {
    chatHistory.replaceChildren();
    if (messages.length === 0) {
      renderMessage('assistant', '把愿望告诉我吧，我会陪你聊聊。');
    } else {
      for (const message of messages) {
        renderMessage(message.role, message.content);
      }
    }
    scrollChatToBottom();
  }

  function addMessage(role, content) {
    messages.push({ role, content });
    messages = messages.slice(-40);
    renderMessage(role, content);
    saveMessages();
    scrollChatToBottom();
  }

  function addTypingMessage() {
    const row = document.createElement('div');
    row.className = 'message-row assistant typing';
    row.setAttribute('role', 'status');
    row.setAttribute('aria-label', '正在回复');
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      dot.setAttribute('aria-hidden', 'true');
      bubble.appendChild(dot);
    }
    row.appendChild(bubble);
    chatHistory.appendChild(row);
    scrollChatToBottom();
    return row;
  }

  function removeTypingMessage(row) {
    row.remove();
  }

  const reply = async () => {
    const question = input.value.trim();

    if (!question) {
      input.focus();
      return;
    }

    if (window.location.protocol === 'file:') {
      addMessage('assistant', '请先启动 server.cjs，再通过 http://localhost:3000 打开页面。');
      return;
    }

    addMessage('user', question);
    input.value = '';
    replyButton.disabled = true;
    replyButton.textContent = '许愿中...';
    const typingMessage = addTypingMessage();

    try {
      const response = await fetch(`${apiBaseUrl}/api/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: messages.slice(-12) }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || '暂时无法回复');
      }

      removeTypingMessage(typingMessage);
      addMessage('assistant', result.reply);
    } catch (error) {
      removeTypingMessage(typingMessage);
      addMessage('assistant', error instanceof Error ? error.message : '暂时无法回复，请稍后再试。');
    } finally {
      replyButton.disabled = false;
      replyButton.textContent = '许愿';
      input.focus();
    }
  };

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    reply();
  });

  renderHistory();
}

resizeCanvas();
syncStarCount();
syncMeteorCount();
createQuestionBox();
window.addEventListener('resize', () => {
  resizeCanvas();
  stars = [];
  meteors = [];
  syncStarCount();
  syncMeteorCount();
});
requestAnimationFrame(step);
