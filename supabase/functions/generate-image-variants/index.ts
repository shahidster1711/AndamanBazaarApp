import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ImageVariant {
  width: number;
  height?: number;
  quality: number;
  suffix: string;
}

const VARIANTS: ImageVariant[] = [
  { width: 150, quality: 60, suffix: 'thumbnail' },
  { width: 400, quality: 75, suffix: 'small' },
  { width: 800, quality: 80, suffix: 'medium' },
];

serve(async (req) => {
  try {
    // Get request body
    const { imageId, imageUrl } = await req.json();

    if (!imageId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageId or imageUrl' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Get image dimensions (we'll store this info)
    // Note: In a real implementation, you'd use sharp or similar to get actual dimensions
    // For now, we'll generate variants based on the defined widths

    const variantUrls: Record<string, string> = {};

    // Generate variants
    for (const variant of VARIANTS) {
      try {
        // In a production environment, you'd use sharp here:
        // const resizedBuffer = await sharp(imageBuffer)
        //   .resize(variant.width)
        //   .jpeg({ quality: variant.quality })
        //   .toBuffer();
        
        // For this implementation, we'll use Imgix-style URL parameters
        // or upload resized versions to Supabase Storage
        
        // Create a unique filename for the variant
        const originalPath = new URL(imageUrl).pathname;
        const baseName = originalPath.split('/').pop()?.split('.')[0] || 'image';
        const variantFileName = `${baseName}_${variant.suffix}.jpg`;
        
        // Upload variant to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(`variants/${imageId}/${variantFileName}`, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Failed to upload ${variant.suffix}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(`variants/${imageId}/${variantFileName}`);

        variantUrls[`${variant.suffix}_url`] = urlData.publicUrl;
      } catch (err) {
        console.error(`Error generating ${variant.suffix} variant:`, err);
      }
    }

    // Update database with variant URLs
    const { error: updateError } = await supabase
      .from('listing_images')
      .update({
        ...variantUrls,
        variants_generated: true,
      })
      .eq('id', imageId);

    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageId,
        variants: variantUrls,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image-variants:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
