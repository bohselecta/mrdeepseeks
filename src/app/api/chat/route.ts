import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const imageFile = formData.get('image') as File | null;

    console.log('API Request received:', { hasImage: !!imageFile, messageLength: message?.length });

    // If there's an image, use DeepInfra's Janus-Pro
    if (imageFile) {
      console.log('Processing image with DeepInfra...');

      // Check if API key is available
      if (!process.env.DEEPINFRA_API_KEY) {
        console.error('DEEPINFRA_API_KEY not found');
        return NextResponse.json(
          { error: 'DeepInfra API key not configured' },
          { status: 500 }
        );
      }

      console.log('DeepInfra API key available, length:', process.env.DEEPINFRA_API_KEY.length);

      // Create FormData for the API call
      const apiFormData = new FormData();
      apiFormData.append('image', imageFile);
      apiFormData.append('question', message || 'Explain this image.');

      console.log('Making DeepInfra API call...');

      // Call DeepInfra API for multimodal
      const response = await fetch(
        'https://api.deepinfra.com/v1/inference/deepseek-ai/Janus-Pro-7B',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
          },
          body: apiFormData
        }
      );

      console.log('DeepInfra API call made, response status:', response.status);

      if (!response.ok) {
        const error = await response.text();
        console.error('DeepInfra API error:', error);
        return NextResponse.json(
          { error: `DeepInfra API failed: ${response.status} - ${error}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      console.log('DeepInfra API response data keys:', Object.keys(data));

      return NextResponse.json({
        content: data.response || 'Unable to analyze image'
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
