'use client';

import { useState, ChangeEvent, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ImageTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the file input

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null); // Clear previous errors
      setProcessedImageUrl(null); // Clear previous result

      // Create a URL for the original image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setOriginalImageUrl(null);
      setProcessedImageUrl(null);
    }
  };

  const handleConvertClick = async () => {
    if (!selectedFile) {
      setError('Please select an image file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedImageUrl(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/image/grayscale', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorDetails = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorDetails = errorJson.error || errorJson.details || errorDetails;
        } catch {
          // Ignore if error response is not JSON
        }
        throw new Error(errorDetails);
      }

      // Handle the image blob response
      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      setProcessedImageUrl(imageUrl);

    } catch (err) {
      console.error('Error converting image:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setProcessedImageUrl(null); // Clear any potential previous result on error
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up Object URLs when the component unmounts or URLs change
  useEffect(() => {
    const originalUrl = originalImageUrl;
    const processedUrl = processedImageUrl;
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, [originalImageUrl, processedImageUrl]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header - Minimal for testing */}
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Image Test Page</Link>
          <nav>
             <Link href="/" className="hover:underline">Back Home</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Image to Grayscale Converter</h1>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
            <input 
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="block w-full text-sm text-gray-500 
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-red-50 file:text-red-700
                         hover:file:bg-red-100 mb-4"
            />
            
            <button
              onClick={handleConvertClick}
              disabled={!selectedFile || isLoading}
              className={`px-6 py-2 rounded-md text-white font-semibold 
                          ${!selectedFile || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                          transition-colors`}
            >
              {isLoading ? 'Converting...' : 'Convert to Grayscale'}
            </button>

            {error && (
              <p className="text-red-600 mt-4">Error: {error}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             {/* Original Image Preview */}
             <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2 text-center">Original</h3>
                <div className="relative w-full h-64 flex justify-center items-center">
                  {originalImageUrl ? (
                      <Image 
                        src={originalImageUrl} 
                        alt="Original preview" 
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded" 
                      />
                  ) : (
                      <div className="text-center text-gray-500">Select an image to preview</div>
                  )}
                </div>
             </div>

             {/* Processed Image Result */}
             <div className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-2 text-center">Grayscale Result</h3>
                <div className="relative w-full h-64 flex justify-center items-center">
                  {isLoading && (
                       <div className="absolute inset-0 flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-700"></div>
                       </div>
                  )}
                  {!isLoading && processedImageUrl ? (
                      <Image 
                        src={processedImageUrl} 
                        alt="Grayscale result" 
                        fill
                        style={{ objectFit: 'contain' }}
                        className="rounded"
                      />
                  ) : !isLoading && (
                      <div className="text-center text-gray-500">Grayscale image will appear here</div>
                  )}
                </div>
             </div>
          </div>

        </div>
      </main>

       {/* Footer - Minimal */}
       <footer className="bg-gray-100 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          Image Processing Test
        </div>
      </footer>
    </div>
  );
} 