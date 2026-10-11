const DEFAULT_QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function corsHeaders(request) {
  const allowedOrigin = 'https://suiq1.github.io';
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
    },
  });
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => typeof part === 'string' ? part : part?.text || '').join('');
}

function buildMessages(history, question) {
  const currentQuestion = question.slice(0, 2000);
  const context = Array.isArray(history)
    ? history
      .filter((message) => (
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message.content === 'string' &&
        message.content.trim()
      ))
      .map((message) => ({
        role: message.role,
        content: message.content.trim().slice(0, 2000),
      }))
      .slice(-12)
    : [];

  const lastMessage = context[context.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== currentQuestion) {
    context.push({ role: 'user', content: currentQuestion });
  }

  return [
    {
      role: 'system',
      content: '你是一个温柔、简洁的中文流星雨许愿助手。请结合前面的聊天内容自然回应用户，控制在两三句话内。',
    },
    ...context,
  ];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname !== '/api/reply') {
      return new Response('Meteor reply worker is running.', { status: 200 });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: '只支持 POST 请求。' }, 405, request);
    }

    if (!env.QWEN_API_KEY) {
      return jsonResponse({ error: 'Worker 尚未配置 QWEN_API_KEY。' }, 500, request);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: '请求格式无效。' }, 400, request);
    }

    const question = typeof payload.question === 'string' ? payload.question.trim() : '';
    if (!question) {
      return jsonResponse({ error: '请输入问题或愿望。' }, 400, request);
    }

    try {
      const baseUrl = (env.QWEN_BASE_URL || DEFAULT_QWEN_URL).replace(/\/$/, '');
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.QWEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.QWEN_MODEL || 'qwen-flash',
          messages: buildMessages(payload.history, question),
          temperature: 0.7,
          max_tokens: 256,
        }),
      });

      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const message = data.error?.message || `模型接口返回 ${upstream.status}`;
        return jsonResponse({ error: `通义千问暂时无法回复：${message}` }, 502, request);
      }

      const reply = contentToText(data.choices?.[0]?.message?.content).trim();
      if (!reply) {
        return jsonResponse({ error: '模型没有返回有效内容。' }, 502, request);
      }

      return jsonResponse({ reply }, 200, request);
    } catch {
      return jsonResponse({ error: '无法连接通义千问，请检查网络或 API Key。' }, 502, request);
    }
  },
};
