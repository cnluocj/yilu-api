import { NextResponse } from 'next/server';
import sharp from 'sharp';

// Add this config block to increase the body size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Allow up to 50MB request bodies
    },
  },
};

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
  // Add Request ID for easier log tracking if needed later
  // const requestId = uuidv4(); 
  const logPrefix = '[API /api/image/grayscale]'; 
  console.log(`${logPrefix} Received POST request.`);

  let initialMemory: NodeJS.MemoryUsage | null = null;
  let memoryAfterLoad: NodeJS.MemoryUsage | null = null;
  let finalMemory: NodeJS.MemoryUsage | null = null;

  try {
    initialMemory = process.memoryUsage();
    console.log(`${logPrefix} Initial memory: ${JSON.stringify(initialMemory)}`);

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
    const inputSizeKB = Math.round(inputBuffer.length / 1024);
    console.log(`${logPrefix} Input file size: ${inputSizeKB} KB`);

    memoryAfterLoad = process.memoryUsage();
    console.log(`${logPrefix} Memory after loading buffer: ${JSON.stringify(memoryAfterLoad)}`);

    // Generate initial grayscale sharp object
    let currentImage = sharp(inputBuffer).grayscale();
    const metadata = await currentImage.metadata();
    let currentWidth = metadata.width ?? 0;
    let currentHeight = metadata.height ?? 0;
    console.log(`${logPrefix} Image dimensions: ${currentWidth}x${currentHeight}`);

    let outputBuffer = inputBuffer; // Start with input, will be replaced if compressed
    let outputContentType = file.type; // Start with original type
    let appliedCompression = false;
    const targetSizeBytes = TARGET_MAX_SIZE_KB * 1024;

    // Check if compression is likely needed (heuristic based on input size)
    // Or simply always run the compression logic if dimensions are valid
    if (currentWidth > 0 && currentHeight > 0 && inputSizeKB > TARGET_MAX_SIZE_KB * 0.8) { // Heuristic: only compress if input is close to/larger than target
      console.log(`${logPrefix} Input size heuristic suggests compression may be needed. Applying balanced iterative compression/resizing...`);
      appliedCompression = true;
      outputContentType = 'image/jpeg'; // Compression always results in JPEG
      
      let iterations = 0;
      // Calculate an estimated size ratio based on raw pixel data vs target size
      // Approximate grayscale bytes: width * height (adjust if using alpha)
      const estimatedRawGrayscaleSize = currentWidth * currentHeight;
      const estimatedSizeRatio = (estimatedRawGrayscaleSize / 1024) / TARGET_MAX_SIZE_KB;
      console.log(`${logPrefix} Estimated raw grayscale size: ~${Math.round(estimatedRawGrayscaleSize / 1024)} KB. Estimated ratio to target: ${estimatedSizeRatio.toFixed(2)}`);

      // --- Initial Balanced Adjustment (Based on estimated ratio) --- 
      let currentQuality = INITIAL_COMPRESSION_QUALITY;
      
      if (estimatedSizeRatio > 1.5) { 
        const estimatedQuality = Math.max(MIN_ESTIMATED_QUALITY, Math.round(INITIAL_COMPRESSION_QUALITY / Math.sqrt(estimatedSizeRatio / INITIAL_QUALITY_SCALE_FACTOR)));
        currentQuality = Math.min(INITIAL_COMPRESSION_QUALITY, Math.max(RESIZE_QUALITY_THRESHOLD, estimatedQuality)); 
        console.log(`${logPrefix} Estimated starting quality based on dimensions: ${currentQuality}`);
      }

      if (estimatedSizeRatio > INITIAL_RESIZE_RATIO_THRESHOLD) {
        const initialResizeFactor = Math.max(INITIAL_RESIZE_MIN_FACTOR, 1 / Math.sqrt(estimatedSizeRatio / INITIAL_RESIZE_SCALE_FACTOR)); 
        const newWidth = Math.floor(currentWidth * initialResizeFactor);
        const newHeight = Math.floor(currentHeight * initialResizeFactor);
        
        if (newWidth >= MIN_DIMENSION && newHeight >= MIN_DIMENSION) {
          console.log(`${logPrefix} Applying initial balanced resize from ${currentWidth}x${currentHeight} to ${newWidth}x${newHeight} (factor: ${initialResizeFactor.toFixed(3)})`);
          currentImage = currentImage.resize(newWidth, newHeight); // Apply resize
          currentWidth = newWidth;
          currentHeight = newHeight;
          currentQuality = QUALITY_RESET_AFTER_RESIZE;
          console.log(`${logPrefix} Resetting quality to ${currentQuality} after initial resize`);
        } else {
            console.log(`${logPrefix} Initial balanced resize skipped, would result in dimensions below minimum.`);
        }
      }
      // --- End Initial Adjustment --- 

      // --- Start Iterative Compression/Resizing Loop --- 
      while (iterations < MAX_ITERATIONS) {
        iterations++;
        let resized = false;

        // --- Resizing Logic --- 
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
            currentQuality = QUALITY_RESET_AFTER_RESIZE;
            console.log(`${logPrefix} [Iter ${iterations}] Resetting quality to ${currentQuality} after resize`);
        }

        // --- Quality Compression Logic --- 
        console.log(`${logPrefix} [Iter ${iterations}] Attempting JPEG compression with quality ${currentQuality} (${currentWidth}x${currentHeight})...`);
        // Generate JPEG buffer for this iteration
        const compressedBuffer = await currentImage
          .jpeg({ quality: currentQuality, progressive: true, optimiseScans: true })
          .toBuffer();
        
        const currentSizeKB = Math.round(compressedBuffer.length / 1024);
        console.log(`${logPrefix} [Iter ${iterations}] Compressed JPEG size: ${currentSizeKB} KB`);

        // Explicitly create a new Buffer to ensure correct type
        outputBuffer = Buffer.from(compressedBuffer); 

        // --- Check if Target Met --- 
        if (compressedBuffer.length <= targetSizeBytes) {
          console.log(`${logPrefix} [Iter ${iterations}] Size under target (${TARGET_MAX_SIZE_KB} KB). Success! Using quality ${currentQuality}, size ${currentWidth}x${currentHeight}.`);
          break; // Found a suitable size, exit loop
        }

        // --- Adjust for Next Iteration --- 
        if (!resized) {
            currentQuality -= QUALITY_STEP_DOWN; 
        }
        
        if (currentQuality < MINIMUM_COMPRESSION_QUALITY) {
            if (currentWidth * RESIZE_FACTOR >= MIN_DIMENSION && currentHeight * RESIZE_FACTOR >= MIN_DIMENSION) {
                console.log(`${logPrefix} [Iter ${iterations}] Hit minimum quality, but resizing still possible. Forcing resize attempt next iteration.`);
                // Setting quality slightly below threshold ensures resize check happens next iteration
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
      } // --- End While Loop --- 

    } else if (currentWidth > 0 && currentHeight > 0) {
       // Input size was small OR dimensions invalid. If dimensions valid, still return grayscale PNG.
       console.log(`${logPrefix} Input size below threshold or dimensions invalid. Trying grayscale PNG output.`);
       try {
         const pngBuffer = await currentImage.png().toBuffer();
         // Explicitly create a new Buffer to ensure correct type
         outputBuffer = Buffer.from(pngBuffer); 
         outputContentType = 'image/png';
         console.log(`${logPrefix} Generated grayscale PNG, size: ${Math.round(outputBuffer.length/1024)} KB`);
       } catch (pngError) {
         console.error(`${logPrefix} Error generating final PNG, falling back to original input:`, pngError);
         // Fallback to original buffer if PNG fails for some reason
         outputBuffer = inputBuffer;
         outputContentType = file.type;
       }
    } else {
        console.error(`${logPrefix} Invalid image dimensions detected after loading.`);
        return NextResponse.json({ error: 'Invalid image dimensions after loading.' }, { status: 400 });
    }

    console.log(`${logPrefix} Final output size: ${Math.round(outputBuffer.length / 1024)} KB, Content-Type: ${outputContentType}`);

    // Log memory before sending response
    finalMemory = process.memoryUsage();
    console.log(`${logPrefix} Final memory before response: ${JSON.stringify(finalMemory)}`);

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
    // Log memory usage even on error
    const errorMemory = process.memoryUsage();
    console.error(`${logPrefix} Memory usage at error: ${JSON.stringify(errorMemory)}`); 
    let errorMessage = 'Failed to process image.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check for specific error types if needed
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        errorMessage = 'Connection closed prematurely by the client during processing.';
        console.error(`${logPrefix} Detected premature close, likely client timeout.`);
    }
    return NextResponse.json({ error: 'An error occurred during image processing.', details: errorMessage }, { status: 500 });
  }
} 