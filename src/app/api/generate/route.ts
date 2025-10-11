// app/api/generate/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 300;

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY!
});

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const systemPrompt = `You are a web app builder. Generate complete, working HTML, CSS, and JavaScript code.

CRITICAL RULES:
1. Generate ONLY the code, no explanations
2. Use this EXACT format with markers:

=== HTML ===
<div class="app">
  <button onclick="sayHello()">Click Me</button>
</div>

=== CSS ===
.app {
  padding: 20px;
}

=== JS ===
function sayHello() {
  alert('Hello World!');
}

IMPORTANT:
- HTML must be complete valid HTML
- CSS must be valid CSS
- JS must use vanilla JavaScript (no imports)
- ALL event handlers must be defined in the JS section
- Use onclick, onchange, etc. attributes that call functions defined in JS

Generate for: ${prompt}`;

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

        let fullContent = '';
        let currentFile = 'html';

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;

          // Detect file switches and send events
          if (fullContent.includes('=== CSS ===') && currentFile === 'html') {
            currentFile = 'css';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'file_switch', file: 'css' })}\n\n`)
            );
          } else if (fullContent.includes('=== JS ===') && currentFile === 'css') {
            currentFile = 'js';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'file_switch', file: 'js' })}\n\n`)
            );
          }

          // Send content (excluding markers)
          const cleanContent = content
            .replace(/^=== HTML ===\s*/g, '')
            .replace(/^=== CSS ===\s*/g, '')
            .replace(/^=== JS ===\s*/g, '');

          if (cleanContent.trim()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content: cleanContent })}\n\n`)
            );
          }
        }

        // Send complete message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        );
        controller.close();
      } catch (error) {
        console.error('Generation error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`)
        );
        controller.close();
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
