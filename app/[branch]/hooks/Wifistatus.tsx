import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Signal, 
  Cable, 
  Globe,
  MonitorCheck
} from 'lucide-react';
import { Alert, AlertDescription } from  '../alert';

// Define the NetworkInformation API types
interface NetworkInformation extends EventTarget {
  readonly downlink: number;
  readonly effectiveType: string;
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type: ConnectionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onchange: ((this: NetworkInformation, ev: Event) => any) | null;
  addEventListener<K extends keyof NetworkInformationEventMap>(
    type: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (this: NetworkInformation, ev: NetworkInformationEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof NetworkInformationEventMap>(
    type: K,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (this: NetworkInformation, ev: NetworkInformationEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
}

interface NetworkInformationEventMap {
  change: Event;
}

// Extend the Navigator interface
declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
    readonly mozConnection?: NetworkInformation;
    readonly webkitConnection?: NetworkInformation;
  }
}

type ConnectionType = 'wifi' | 'ethernet' | 'cellular' | 'unknown';

interface NetworkStatusState {
  online: boolean;
  downlink: number | null;
  effectiveType: string | null;
  rtt: number | null;
  speedHistory: number[];
  averageSpeed: number | null;
  connectionType: ConnectionType;
  isLocalhost: boolean;
  isDevelopment: boolean;
}

interface ConnectionDetails {
  ipAddress?: string;
}

const initialNetworkStatus: NetworkStatusState = {
  online: true,
  downlink: null,
  effectiveType: null,
  rtt: null,
  speedHistory: [],
  averageSpeed: null,
  connectionType: 'unknown',
  isLocalhost: false,
  isDevelopment: false
};

const NetworkStatus = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showMonitor, setShowMonitor] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusState>(initialNetworkStatus);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isClient, setIsClient] = useState(false);

  // Helper function to get the connection object safely
  const getConnection = useCallback((): NetworkInformation | undefined => {
    if (typeof navigator === 'undefined') return undefined;
    return navigator.connection || 
           navigator.mozConnection || 
           navigator.webkitConnection;
  }, []);

  useEffect(() => {
    setIsClient(true);
    setNetworkStatus(prev => ({
      ...prev,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true
    }));
  }, []);

  const detectConnectionType = useCallback(async () => {
    const isDev = process.env.NODE_ENV === 'development';
    const isLocal = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1');

    let connectionType: ConnectionType = 'unknown';
    const details: ConnectionDetails = {};

    const connection = getConnection();
    if (connection?.type) {
      connectionType = connection.type as ConnectionType;
    }

    return { connectionType, details, isDev, isLocal };
  }, [getConnection]);

  const updateNetworkStatus = useCallback(async () => {
    if (typeof navigator === 'undefined') return;

    const connection = getConnection();
    const currentDownlink = connection?.downlink ?? 0;
    const { connectionType, details, isDev, isLocal } = await detectConnectionType();

    setConnectionDetails(details);
    setNetworkStatus(prevStatus => {
      const newSpeedHistory = [...prevStatus.speedHistory, currentDownlink].slice(-10);
      const newAverageSpeed = newSpeedHistory.length > 0 
        ? newSpeedHistory.reduce((a, b) => a + b, 0) / newSpeedHistory.length 
        : null;

      return {
        online: navigator.onLine,
        downlink: currentDownlink,
        effectiveType: connection?.effectiveType ?? null,
        rtt: connection?.rtt ?? null,
        speedHistory: newSpeedHistory,
        averageSpeed: newAverageSpeed,
        connectionType,
        isLocalhost: isLocal,
        isDevelopment: isDev
      };
    });

    setLastUpdate(new Date());
  }, [detectConnectionType, getConnection]);

  useEffect(() => {
    if (!isClient) return;

    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();
    const handleConnectionChange = () => updateNetworkStatus();

    updateNetworkStatus();
    const intervalId = setInterval(updateNetworkStatus, 2000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = getConnection();
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus, isClient, getConnection]);

  const getConnectionIcon = () => {
    if (!networkStatus.online) return <WifiOff className="h-5 w-5" />;
    switch (networkStatus.connectionType) {
      case 'wifi': return <Wifi className="h-5 w-5" />;
      case 'ethernet': return <Cable className="h-5 w-5" />;
      case 'cellular': return <Signal className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  const getConnectionColor = () => {
    if (!networkStatus.online) return 'bg-red-500';
    if (networkStatus.isLocalhost) return 'bg-purple-500';
    
    const speed = networkStatus.averageSpeed ?? 0;
    if (speed > 50) return 'bg-green-500';
    if (speed > 20) return 'bg-blue-500';
    if (speed > 5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (!isClient) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          // onClick={() => setShowMonitor(!showMonitor)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
            transition-all duration-300 ${getConnectionColor()} text-white
          `}
          aria-label="Network status"
        >
          {getConnectionIcon()}
          <span className="text-sm font-medium">
            {networkStatus.online ? 'Online' : 'Offline'}
          </span>
          <Activity className={`h-4 w-4 ${networkStatus.online ? 'animate-pulse' : ''}`} />
        </button>

        {showMonitor && (
          <div className="absolute right-0 mt-2">
            <Alert className={`${getConnectionColor()} text-white shadow-xl w-72`}>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getConnectionIcon()}
                    <AlertDescription>
                      {networkStatus.connectionType.charAt(0).toUpperCase() + 
                       networkStatus.connectionType.slice(1)} Connection
                    </AlertDescription>
                  </div>
                </div>
                
                {networkStatus.online && (
                  <>
                    <div className="text-sm">
                      Speed: {networkStatus.averageSpeed?.toFixed(1) ?? 0} Mbps
                      {networkStatus.rtt && ` | Latency: ${networkStatus.rtt}ms`}
                    </div>
                    
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/60 transition-all duration-300"
                        style={{ 
                          width: `${Math.min(((networkStatus.averageSpeed ?? 0) / 100) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </>
                )}
                
                <div className="flex justify-between items-center text-xs opacity-75">
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                  <MonitorCheck className="h-4 w-4" />
                </div>
              </div>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatus;