import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import logo from '../public/logo.png'

export default function LeftBanner() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="h-32 md:h-auto md:w-1/2 relative bg-gradient-to-br bg-white to-blue-700 overflow-hidden">
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
        {!imageLoaded && !imageError && (
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <Building2 className="w-16 h-16 text-white/80" />
            <div className="h-8 w-48 bg-white/20 rounded-lg" />
          </div>
        )}
        
        {imageError && (
          <div className="flex flex-col items-center space-y-4">
            <Building2 className="w-16 h-16" />
            <h2 className="text-4xl font-bold text-center">Customer Connect</h2>
          </div>
        )}
      </div>

      <div className="relative w-full h-full">
        <Image
          src={logo}
          alt="Customer Connect"
          fill
          priority
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          sizes="(max-width: 600px) 50vw, 100vw"
          style={{ objectFit: 'contain' }} 
          onError={() => setImageError(true)}
        />
      </div>

      {/* <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}>
        <h2 className="text-4xl font-bold text-white text-center px-4">
          Customer Connect
        </h2>
        <p className="mt-2 text-white/90 text-center text-lg max-w-xs">
          Your trusted platform for seamless connectivity
        </p>
      </div> */}

      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-900/30 to-transparent pointer-events-none" />
    </div>
  );
}
