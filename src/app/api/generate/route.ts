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

    const systemPrompt = `You are a web app builder. Generate ONE complete, working HTML file with embedded CSS and JavaScript.

CRITICAL RULES:
1. Generate ONLY the complete HTML file, no explanations
2. Include <!DOCTYPE html> declaration
3. Put ALL CSS in a <style> tag in the <head>
4. Put ALL JavaScript in a <script> tag at the END of <body>
5. Make sure ALL functions are defined in the script tag
6. Use vanilla JavaScript (no imports)
7. Make sure onclick, onchange, etc. work properly

Example format:
<!DOCTYPE html>
<html>
<head>
  <style>
    .app { padding: 20px; }
    button { background: blue; color: white; }
  </style>
</head>
<body>
  <div class="app">
    <button onclick="sayHello()">Click Me</button>
  </div>

  <script>
    function sayHello() {
      alert('Hello World!');
    }
  </script>
</body>
</html>

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

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';

          if (content.trim()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content', content: content })}\n\n`)
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
