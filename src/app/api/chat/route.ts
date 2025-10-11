import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const imageFile = formData.get('image') as File | null;

    // If there's an image, use DeepInfra's Janus-Pro
    if (imageFile) {
      // Convert image to base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Call DeepInfra API for multimodal
      const response = await fetch(
        'https://api.deepinfra.com/v1/inference/deepseek-ai/Janus-Pro-7B',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              image: base64,
              prompt: message || 'Describe this image in detail.',
              max_new_tokens: 512,
              temperature: 0.7,
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('DeepInfra API error:', error);
        throw new Error(`DeepInfra API failed: ${response.status}`);
      }

      const data = await response.json();

      return NextResponse.json({
        content: data.output || data.results?.[0] || 'Unable to analyze image'
      });
    }

    // No image - use regular DeepSeek text API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are Mr. Deepseeks, a helpful AI assistant.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('DeepSeek API failed');
    }

    const data = await response.json();

    return NextResponse.json({
      content: data.choices[0].message.content,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
