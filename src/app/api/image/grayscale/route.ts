import { NextResponse } from 'next/server';
import sharp from 'sharp';

// Target maximum file size in KB
const TARGET_MAX_SIZE_KB = 400;
// Compression settings
const INITIAL_COMPRESSION_QUALITY = 90;
const MINIMUM_COMPRESSION_QUALITY = 10; // Lowered minimum quality
const QUALITY_STEP_DOWN = 15; // Increased step
const RESIZE_QUALITY_THRESHOLD = 60; // Quality below which we start resizing
const RESIZE_FACTOR = 0.85; // Increased resize factor
const MIN_DIMENSION = 100; // Minimum width or height in pixels
const MAX_ITERATIONS = 15; // Reduced iterations
const INITIAL_RESIZE_RATIO_THRESHOLD = 5; // Ratio above which we apply initial resize
// New constants for balanced initial adjustments
const INITIAL_RESIZE_SCALE_FACTOR = 2.0; // divisor in sqrt, higher = less aggressive resize
const INITIAL_RESIZE_MIN_FACTOR = 0.25; // Don't resize smaller than 25%
const INITIAL_QUALITY_SCALE_FACTOR = 1.8; // divisor in sqrt, higher = less aggressive quality reduction
const MIN_ESTIMATED_QUALITY = 35;
const QUALITY_RESET_AFTER_RESIZE = 75; // Fixed quality to try after resize

export async function POST(request: Request) {
  const logPrefix = '[API /api/image/grayscale]';
  console.log(`${logPrefix} Received POST request.`);

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      console.error(`${logPrefix} No image file found in form data.`);
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      console.error(`${logPrefix} Uploaded file is not an image: ${file.type}`);
      return NextResponse.json({ error: 'Uploaded file is not a valid image.' }, { status: 400 });
    }

    console.log(`${logPrefix} Processing image: ${file.name} (${file.type})`);

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Generate initial grayscale sharp object
    let currentImage = sharp(inputBuffer).grayscale();
    const metadata = await currentImage.metadata();
    let currentWidth = metadata.width ?? 0;
    let currentHeight = metadata.height ?? 0;

    // Get the initial grayscale buffer (prefer PNG initially for lossless grayscale)
    const initialGrayscaleBuffer = await currentImage.png().toBuffer();
    const initialSizeKB = Math.round(initialGrayscaleBuffer.length / 1024);
    console.log(`${logPrefix} Initial grayscale size (PNG): ${initialSizeKB} KB (${currentWidth}x${currentHeight})`);

    let outputBuffer = initialGrayscaleBuffer;
    let outputContentType = 'image/png'; 
    let appliedCompression = false;
    const targetSizeBytes = TARGET_MAX_SIZE_KB * 1024;

    // Check if compression is needed
    if (outputBuffer.length > targetSizeBytes) {
      console.log(`${logPrefix} Size exceeds ${TARGET_MAX_SIZE_KB} KB. Applying balanced iterative compression/resizing...`);
      appliedCompression = true;
      outputContentType = 'image/jpeg'; // Compression always results in JPEG
      
      let iterations = 0;
      const sizeRatio = initialSizeKB / TARGET_MAX_SIZE_KB;

      // --- Initial Balanced Adjustment --- 
      let currentQuality = INITIAL_COMPRESSION_QUALITY;
      
      // Estimate initial quality, less aggressively
      if (sizeRatio > 1.5) { 
        const estimatedQuality = Math.max(MIN_ESTIMATED_QUALITY, Math.round(INITIAL_COMPRESSION_QUALITY / Math.sqrt(sizeRatio / INITIAL_QUALITY_SCALE_FACTOR)));
        // Ensure estimated quality isn't drastically low initially, cap it to avoid immediate resize trigger if possible
        currentQuality = Math.min(INITIAL_COMPRESSION_QUALITY, Math.max(RESIZE_QUALITY_THRESHOLD, estimatedQuality)); 
        console.log(`${logPrefix} Initial size ratio: ${sizeRatio.toFixed(2)}. Estimated starting quality: ${currentQuality}`);
      }

      // Apply initial resize if ratio is very high, less aggressively
      if (sizeRatio > INITIAL_RESIZE_RATIO_THRESHOLD) {
        // Use the less aggressive factor with the defined minimum
        const initialResizeFactor = Math.max(INITIAL_RESIZE_MIN_FACTOR, 1 / Math.sqrt(sizeRatio / INITIAL_RESIZE_SCALE_FACTOR)); 
        const newWidth = Math.floor(currentWidth * initialResizeFactor);
        const newHeight = Math.floor(currentHeight * initialResizeFactor);
        
        if (newWidth >= MIN_DIMENSION && newHeight >= MIN_DIMENSION) {
          console.log(`${logPrefix} Applying initial balanced resize from ${currentWidth}x${currentHeight} to ${newWidth}x${newHeight} (factor: ${initialResizeFactor.toFixed(3)})`);
          currentImage = currentImage.resize(newWidth, newHeight); // Apply resize
          currentWidth = newWidth;
          currentHeight = newHeight;
          // Reset quality high after initial resize
          currentQuality = QUALITY_RESET_AFTER_RESIZE; // Use the defined constant
          console.log(`${logPrefix} Resetting quality to ${currentQuality} after initial resize`);
        } else {
            console.log(`${logPrefix} Initial balanced resize skipped, would result in dimensions below minimum.`);
        }
      }
      // --- End Initial Adjustment --- 

      while (iterations < MAX_ITERATIONS) {
        iterations++;
        let resized = false;

        // --- Resizing Logic (Iterative) --- 
        if (currentQuality < RESIZE_QUALITY_THRESHOLD && 
            currentWidth * RESIZE_FACTOR >= MIN_DIMENSION && 
            currentHeight * RESIZE_FACTOR >= MIN_DIMENSION) 
        {
            const newWidth = Math.floor(currentWidth * RESIZE_FACTOR);
            const newHeight = Math.floor(currentHeight * RESIZE_FACTOR);
            console.log(`${logPrefix} [Iter ${iterations}] Resizing from ${currentWidth}x${currentHeight} to ${newWidth}x${newHeight}`);
            currentImage = currentImage.resize(newWidth, newHeight); 
            currentWidth = newWidth;
            currentHeight = newHeight;
            resized = true;
            // Reset quality to a fixed higher value after resize
            currentQuality = QUALITY_RESET_AFTER_RESIZE; // Use the defined constant
            console.log(`${logPrefix} [Iter ${iterations}] Resetting quality to ${currentQuality} after resize`);
        }

        // --- Quality Compression Logic --- 
        console.log(`${logPrefix} [Iter ${iterations}] Attempting compression with quality ${currentQuality} (${currentWidth}x${currentHeight})...`);
        const compressedBuffer = await currentImage
          .jpeg({ quality: currentQuality, progressive: true, optimiseScans: true })
          .toBuffer();
        
        const currentSizeKB = Math.round(compressedBuffer.length / 1024);
        console.log(`${logPrefix} [Iter ${iterations}] Compressed size: ${currentSizeKB} KB`);

        outputBuffer = compressedBuffer; // Store the latest result

        // --- Check if Target Met --- 
        if (compressedBuffer.length <= targetSizeBytes) {
          console.log(`${logPrefix} [Iter ${iterations}] Size under target (${TARGET_MAX_SIZE_KB} KB). Success! Using quality ${currentQuality}, size ${currentWidth}x${currentHeight}.`);
          break; // Found a suitable size, exit loop
        }

        // --- Adjust for Next Iteration --- 
        // If we didn't resize in this iteration, reduce quality
        if (!resized) {
            currentQuality -= QUALITY_STEP_DOWN; 
        }
        
        // Check if minimum quality is reached
        if (currentQuality < MINIMUM_COMPRESSION_QUALITY) {
            if (currentWidth * RESIZE_FACTOR >= MIN_DIMENSION && currentHeight * RESIZE_FACTOR >= MIN_DIMENSION) {
                console.log(`${logPrefix} [Iter ${iterations}] Hit minimum quality, but resizing still possible. Forcing resize attempt next iteration.`);
                currentQuality = RESIZE_QUALITY_THRESHOLD - 1; 
            } else {
                console.warn(`${logPrefix} [Iter ${iterations}] Reached minimum quality (${MINIMUM_COMPRESSION_QUALITY}) and minimum dimensions (${currentWidth}x${currentHeight}). Cannot reduce further. Using last result (${currentSizeKB} KB).`);
                break; 
            }
        }
        
        if (iterations >= MAX_ITERATIONS) {
            console.warn(`${logPrefix} Reached maximum iterations (${MAX_ITERATIONS}). Using last result (${currentSizeKB} KB).`);
            break;
        }
      }
    } else {
       console.log(`${logPrefix} Image size is within limit. No compression applied.`);
    }

    console.log(`${logPrefix} Final output size: ${Math.round(outputBuffer.length / 1024)} KB, Content-Type: ${outputContentType}`);

    // Return the processed image buffer
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': outputContentType,
        'X-Compression-Applied': appliedCompression ? 'true' : 'false', 
        'Content-Disposition': `inline; filename="processed_${file.name}"`, 
      },
    });

  } catch (error) {
    console.error(`${logPrefix} Error processing image:`, error);
    let errorMessage = 'Failed to process image.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: 'An error occurred during image processing.', details: errorMessage }, { status: 500 });
  }
} 