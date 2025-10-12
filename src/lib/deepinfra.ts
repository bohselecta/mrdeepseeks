// lib/deepinfra.ts

interface DeepInfraResponse {
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  cost: number;
}

export async function analyzeImage(imageBase64: string, question: string): Promise<DeepInfraResponse> {
  const response = await fetch('https://api.deepinfra.com/v1/inference/deepseek-ai/Janus-Pro-7B', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        image: imageBase64,
        prompt: question,
        max_new_tokens: 512,
        temperature: 0.7,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`DeepInfra API failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    content: data.output || data.results?.[0] || 'Unable to analyze image',
    cost: 0.002, // $0.002 per image analysis
  };
}

export async function generateImage(prompt: string): Promise<DeepInfraResponse> {
  const response = await fetch('https://api.deepinfra.com/v1/openai/images/generations', {
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
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.data && data.data[0] && data.data[0].b64_json) {
    return {
      imageUrl: `data:image/jpeg;base64,${data.data[0].b64_json}`,
      cost: 0.05, // $0.05 per image
    };
  } else {
    throw new Error('Invalid response format from image API');
  }
}

export async function generateVideo(prompt: string): Promise<DeepInfraResponse> {
  const response = await fetch('https://api.deepinfra.com/v1/inference/Wan-AI/Wan2.1-T2V-1.3B', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Video generation failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.video_url) {
    return {
      videoUrl: data.video_url,
      cost: 0.10, // $0.10 per video
    };
  } else {
    throw new Error('Invalid response format from video API');
  }
}
