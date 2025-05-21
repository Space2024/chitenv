import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const NotFoundPage: React.FC = () => {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const calculateEyePosition = () => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    
    // Calculate the eye movement (limited range)
    const eyeX = (mousePosition.x / windowWidth - 0.5) * 10;
    const eyeY = (mousePosition.y / windowHeight - 0.5) * 10;
    
    return { transform: `translate(${eyeX}px, ${eyeY}px)` };
  };
  
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Animated background particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: `${Math.random() * 8 + 2}px`,
              height: `${Math.random() * 8 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-8">
          <h1 className="text-9xl font-extrabold text-white tracking-widest">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-gradient">
              404
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-white font-medium mt-4 mb-8">
            Oops! The page you&apos;re looking for doesn&apos;t exist
          </p>
        </div>
        
        <div 
          className="relative w-64 h-64 mb-8 transition-transform duration-300 hover:scale-110"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="relative z-10 w-full h-full rounded-full bg-green-500 flex items-center justify-center overflow-hidden shadow-xl">
            {/* Mike Wazowski body */}
            <div className="absolute inset-0 bg-green-500 rounded-full" />
            
            {/* Eye white background */}
            <div className="absolute w-32 h-32 bg-white rounded-full top-6 overflow-hidden">
              {/* Pupil that follows mouse */}
              <div 
                className="absolute w-16 h-16 bg-teal-600 rounded-full top-8 left-8 transition-transform duration-75"
                style={calculateEyePosition()}
              >
                <div className="absolute w-6 h-6 bg-black rounded-full top-5 left-5" />
                <div className="absolute w-2 h-2 bg-white rounded-full top-3 left-3" />
              </div>
            </div>
            
            {/* Mouth */}
            <div className={`absolute bottom-14 w-24 h-12 ${isHovering ? 'rounded-t-full' : 'rounded-b-full'} bg-gray-700 transition-all duration-300`} />
            
            {/* Arms and legs */}
            <div className="absolute bottom-0 left-5 w-4 h-16 bg-green-600 rounded-full" />
            <div className="absolute bottom-0 right-5 w-4 h-16 bg-green-600 rounded-full" />
            <div className="absolute bottom-0 left-14 w-4 h-8 bg-green-600 rounded-full" />
            <div className="absolute bottom-0 right-14 w-4 h-8 bg-green-600 rounded-full" />
          </div>
        </div>
        
        <div className="text-white text-center max-w-md">
          <p className="mb-6">
            You must have picked the wrong door. I haven&apos;t been able to lay my eye on the page you&apos;re searching for.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold uppercase tracking-wide text-white shadow-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-300"
          >
            Find Valid URL
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
          100% { transform: translateY(0) translateX(0); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 4s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;