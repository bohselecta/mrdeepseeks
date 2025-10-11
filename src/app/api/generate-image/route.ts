import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check if API key is available
    if (!process.env.DEEPINFRA_API_KEY) {
      console.error('DEEPINFRA_API_KEY not found');
      return NextResponse.json(
        { error: 'Image generation service not configured' },
        { status: 500 }
      );
    }

    console.log('Generating image with prompt:', prompt);

    const response = await fetch(
      'https://api.deepinfra.com/v1/openai/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          size: '1024x1024',
          model: 'black-forest-labs/FLUX-1-dev',
          n: 1,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Image generation API error:', error);
      return NextResponse.json(
        { error: `Image generation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].b64_json) {
      return NextResponse.json({
        imageUrl: `data:image/jpeg;base64,${data.data[0].b64_json}`,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid response format from image API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to generate image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}
