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
        { error: 'Video generation service not configured' },
        { status: 500 }
      );
    }

    console.log('Generating video with prompt:', prompt);

    const response = await fetch(
      'https://api.deepinfra.com/v1/inference/Wan-AI/Wan2.1-T2V-1.3B',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Video generation API error:', error);
      return NextResponse.json(
        { error: `Video generation failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.video_url) {
      return NextResponse.json({
        videoUrl: data.video_url,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid response format from video API' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to generate video:', error);
    return NextResponse.json(
      { error: 'Failed to generate video. Please try again.' },
      { status: 500 }
    );
  }
}
