import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API key is configured
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GOOGLE_CLOUD_VISION_API_KEY is not set in .env.local',
      });
    }

    // Try to import the vision library
    try {
      const vision = await import('@google-cloud/vision');
      
      return NextResponse.json({
        success: true,
        message: 'Google Cloud Vision library is installed',
        apiKeyConfigured: true,
        apiKeyPreview: apiKey.substring(0, 10) + '...',
      });
    } catch (importError: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to import @google-cloud/vision',
        details: importError.message,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message,
    });
  }
}

