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

    const systemPrompt = `You are a web app builder. Generate a SINGLE, COMPLETE, WORKING HTML file.

CRITICAL RULES:
1. Generate ONE complete HTML document
2. Include ALL styles in <style> tags in <head>
3. Include ALL JavaScript in <script> tags before </body>
4. ALL code must work when opened as a single .html file
5. Use vanilla JavaScript only (no imports, no external libraries except CDN)
6. Make event handlers work with onclick, onchange, etc. attributes

JAVASCRIPT STRUCTURE (CRITICAL):
- Declare ALL variables at the TOP of the script
- Use 'let' or 'const' for all variable declarations
- Define variables BEFORE any functions that use them
- Put initialization code in DOMContentLoaded or at the end

EXAMPLE:
<script>
  // ✅ CORRECT: Variables first
  let count = 0;
  let todos = [];

  // Then functions
  function increment() {
    count++;
    updateDisplay();
  }

  function updateDisplay() {
    document.getElementById('count').textContent = count;
  }

  // Then initialization
  document.addEventListener('DOMContentLoaded', function() {
    updateDisplay();
  });
</script>

TEMPLATE STRUCTURE:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Title</title>
  <style>
    /* ALL CSS HERE */
    body {
      font-family: system-ui;
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
  <!-- ALL HTML HERE -->
  <button onclick="handleClick()">Click Me</button>

  <script>
    // Variables first
    let data = 'Hello';

    // Functions second
    function handleClick() {
      alert(data);
    }
  </script>
</body>
</html>

Generate a complete, working HTML file for: ${prompt}

IMPORTANT: Generate ONLY the HTML code, no explanations, no markdown code blocks.`;

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

          // Stream the raw HTML content
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: content
              })}\n\n`)
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
