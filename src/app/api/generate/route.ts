// app/api/generate/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 minutes max

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY!
});

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const systemPrompt = `You are a web app builder. Generate complete HTML, CSS, and JavaScript code.

CRITICAL FORMAT:
1. Start with "=== HTML ===" then the HTML code
2. Then "=== CSS ===" then the CSS code
3. Then "=== JS ===" then the JavaScript code

Example:
=== HTML ===
<div class="app">
  <h1>Calculator</h1>
  <input id="display" readonly>
  <div class="buttons">
    <button onclick="calculate('1')">1</button>
  </div>
</div>

=== CSS ===
.app {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
}

=== JS ===
function calculate(val) {
  document.getElementById('display').value += val;
}

Generate complete, working code for: ${prompt}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.0, // Deterministic for coding
          stream: true
        });

        let currentFile: 'html' | 'css' | 'js' = 'html';
        let buffer = '';

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          buffer += content;

          // Detect file switches
          if (buffer.includes('=== CSS ===')) {
            currentFile = 'css';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'file_switch', file: 'css' })}\n\n`)
            );
            buffer = buffer.split('=== CSS ===')[1] || '';
          } else if (buffer.includes('=== JS ===')) {
            currentFile = 'js';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'file_switch', file: 'js' })}\n\n`)
            );
            buffer = buffer.split('=== JS ===')[1] || '';
          }

          // Send content chunks (excluding markers)
          const cleanContent = content
            .replace(/=== HTML ===/g, '')
            .replace(/=== CSS ===/g, '')
            .replace(/=== JS ===/g, '');

          if (cleanContent) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content: cleanContent, file: currentFile })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Generation error:', error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
