const canvas = document.getElementById('comet-canvas');
const ctx = canvas.getContext('2d');
const apiBaseUrl = (window.QWEN_API_BASE_URL || '').replace(/\/$/, '');

const params = {
  meteorCount: 10,
  speedMin: 260,
  speedMax: 440,
  lengthMin: 40,
  lengthMax: 100,
  directionAngle: Math.PI * 0.75, // 135 degrees: upper-right to lower-left
  directionSpread: 0.04,
  opacityMin: 0.3,
  opacityMax: 0.8,
};

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let meteors = [];
let lastTime = performance.now();

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

function createMeteor(initial = false) {
  const angle = params.directionAngle + randomRange(-params.directionSpread, params.directionSpread);
  const speed = randomRange(params.speedMin, params.speedMax);
  const length = randomRange(params.lengthMin, params.lengthMax);

  return {
    x: initial ? randomRange(width * 0.45, width + length) : width + length,
    y: initial ? randomRange(-length, height * 0.38) : randomRange(-length, height * 0.38),
    length,
    speed,
    angle,
    opacity: randomRange(params.opacityMin, params.opacityMax),
    lineWidth: randomRange(1, 2),
  };
}

function resetMeteor(meteor) {
  Object.assign(meteor, createMeteor(false));
}

function syncMeteorCount() {
  while (meteors.length < params.meteorCount) {
    meteors.push(createMeteor(true));
  }
  if (meteors.length > params.meteorCount) {
    meteors.length = params.meteorCount;
  }
}

function updateMeteors(dt) {
  for (const meteor of meteors) {
    meteor.x += Math.cos(meteor.angle) * meteor.speed * dt;
    meteor.y += Math.sin(meteor.angle) * meteor.speed * dt;

    if (meteor.x < -meteor.length || meteor.y > height + meteor.length) {
      resetMeteor(meteor);
    }
  }
}

function drawMeteors() {
  ctx.globalCompositeOperation = 'lighter';

  for (const meteor of meteors) {
    const headX = meteor.x;
    const headY = meteor.y;
    const tailX = headX - Math.cos(meteor.angle) * meteor.length;
    const tailY = headY - Math.sin(meteor.angle) * meteor.length;

    const gradient = ctx.createLinearGradient(headX, headY, tailX, tailY);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity})`);
    gradient.addColorStop(1, 'rgba(170, 210, 255, 0)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = meteor.lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, meteor.opacity + 0.2)})`;
    ctx.beginPath();
    ctx.arc(headX, headY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function step(now) {
  const dt = Math.max(0.001, Math.min(0.033, (now - lastTime) / 1000));
  lastTime = now;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, width, height);

  syncMeteorCount();
  updateMeteors(dt);
  drawMeteors();
  requestAnimationFrame(step);
}

function createQuestionBox() {
  const box = document.getElementById('qa-box');
  const input = document.getElementById('question-input');
  const replyButton = document.getElementById('reply-button');
  const replyMessage = document.getElementById('reply-message');

  const reply = async () => {
    const question = input.value.trim();
    box.classList.add('has-reply');

    if (!question) {
      replyMessage.textContent = '先写下你的问题或愿望。';
      input.focus();
      return;
    }

    if (window.location.protocol === 'file:') {
      replyMessage.textContent = '请先启动 server.cjs，再通过 http://localhost:3000 打开页面。';
      return;
    }

    replyButton.disabled = true;
    replyButton.textContent = '回复中...';
    replyMessage.textContent = '流星正在为你寻找答案...';

    try {
      const response = await fetch(`${apiBaseUrl}/api/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || '暂时无法回复');
      }

      replyMessage.textContent = result.reply;
    } catch (error) {
      replyMessage.textContent = error instanceof Error
        ? error.message
        : '暂时无法回复，请稍后再试。';
    } finally {
      replyButton.disabled = false;
      replyButton.textContent = '回复';
    }
  };

  replyButton.addEventListener('click', reply);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      reply();
    }
  });
}

resizeCanvas();
syncMeteorCount();
createQuestionBox();
window.addEventListener('resize', () => {
  resizeCanvas();
  meteors = [];
  syncMeteorCount();
});
requestAnimationFrame(step);
