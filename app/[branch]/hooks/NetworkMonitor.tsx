import React, { useState, useEffect, useCallback } from 'react';
import { 

  Wifi, 
  WifiOff, 
  Activity, 
  Signal, 
  Cable, 
  Globe,
  Server,
  GitBranch,
  MonitorCheck
} from 'lucide-react';
import { Alert, AlertDescription, } from '../alert';

interface NetworkStatus {
  online: boolean;
  downlink: number | null;
  effectiveType: string | null;
  rtt: number | null;
  speedHistory: number[];
  averageSpeed: number | null;
  connectionType: 'wifi' | 'ethernet' | 'cellular' | 'unknown';
  isLocalhost: boolean;
  isDevelopment: boolean;
}

interface ConnectionDetails {
  ssid?: string;
  strength?: number;
  frequency?: number;
  ipAddress?: string;
}

const NetworkMonitor: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: true,
    downlink: null,
    effectiveType: null,
    rtt: null,
    speedHistory: [],
    averageSpeed: null,
    connectionType: 'unknown',
    isLocalhost: false,
    isDevelopment: false
  });
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAlert, setShowAlert] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Detect connection type and environment
  const detectConnectionType = useCallback(async () => {
    // Check if running in development
    const isDev = process.env.NODE_ENV === 'development';
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

    let connectionType: 'wifi' | 'ethernet' | 'cellular' | 'unknown' = 'unknown';
    let details: ConnectionDetails = {};

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connection = (navigator as any).connection;
      
      // Try to get network information using NetworkInformation API
      if (connection) {
        if (connection.type === 'wifi') {
          connectionType = 'wifi';
        } else if (connection.type === 'ethernet') {
          connectionType = 'ethernet';
        } else if (connection.type === 'cellular') {
          connectionType = 'cellular';
        }
      }

      // Try to get WiFi details if available
      if ('getNetworkInformation' in navigator) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const networkInfo = await (navigator as any).getNetworkInformation();
          if (networkInfo?.type === 'wifi') {
            details = {
              ssid: networkInfo.ssid,
              strength: networkInfo.signalStrength,
              frequency: networkInfo.frequency
            };
          }
        } catch  {
          console.warn('Unable to get detailed network information');
        }
      }

      // Try to get IP address
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        details.ipAddress = data.ip;
      } catch {
        console.warn('Unable to get IP address');
      }

    } catch (error) {
      console.warn('Error detecting connection type:', error);
    }

    return { connectionType, details, isDev, isLocal };
  }, []);

  const updateNetworkStatus = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = (navigator as any).connection || 
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (navigator as any).mozConnection || 
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (navigator as any).webkitConnection;

    const currentDownlink = connection?.downlink || 0;
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
        effectiveType: connection?.effectiveType || null,
        rtt: connection?.rtt || null,
        speedHistory: newSpeedHistory,
        averageSpeed: newAverageSpeed,
        connectionType,
        isLocalhost: isLocal,
        isDevelopment: isDev
      };
    });

    setLastUpdate(new Date());
  }, [detectConnectionType]);

  useEffect(() => {
    updateNetworkStatus();
    const intervalId = setInterval(updateNetworkStatus, 2000);

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  const getConnectionIcon = () => {
    if (!networkStatus.online) return <WifiOff className="h-5 w-5" />;
    switch (networkStatus.connectionType) {
      case 'wifi':
        return <Wifi className="h-5 w-5" />;
      case 'ethernet':
        return <Cable className="h-5 w-5" />;
      case 'cellular':
        return <Signal className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getConnectionColor = () => {
    if (!networkStatus.online) return 'bg-red-500';
    if (networkStatus.isLocalhost) return 'bg-purple-500';
    
    const speed = networkStatus.averageSpeed || 0;
    if (speed > 50) return 'bg-green-500';
    if (speed > 20) return 'bg-blue-500';
    if (speed > 5) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const formatConnectionInfo = () => {
    const info = [];
    
    // Connection type and speed
    if (networkStatus.averageSpeed !== null) {
      info.push(`${networkStatus.averageSpeed.toFixed(1)} Mbps`);
    }
    
    // WiFi details
    if (networkStatus.connectionType === 'wifi' && connectionDetails.ssid) {
      info.push(`SSID: ${connectionDetails.ssid}`);
      if (connectionDetails.strength) {
        info.push(`Signal: ${connectionDetails.strength}%`);
      }
    }
    
    // IP Address
    if (connectionDetails.ipAddress) {
      info.push(`IP: ${connectionDetails.ipAddress}`);
    }
    
    // Latency
    if (networkStatus.rtt) {
      info.push(`Latency: ${networkStatus.rtt}ms`);
    }

    return info.join(' | ');
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Alert
        className={`
          shadow-lg
          ${getConnectionColor()}
          text-white
          ${!showAlert ? 'opacity-75 hover:opacity-100' : 'opacity-100'}
          transition-all duration-300 ease-in-out
          min-w-72
        `}
      >
        <div className="flex flex-col space-y-2">
          {/* Connection Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <AlertDescription>
                {networkStatus.online ? 
                  `${networkStatus.connectionType.charAt(0).toUpperCase()}${networkStatus.connectionType.slice(1)} Connection` : 
                  "Offline"}
              </AlertDescription>
            </div>
            <Activity className={`h-4 w-4 ${networkStatus.online ? 'animate-pulse' : ''}`} />
          </div>
          
          {/* Environment Indicators */}
          {(networkStatus.isDevelopment || networkStatus.isLocalhost) && (
            <div className="flex items-center space-x-2 text-xs bg-black/20 rounded p-1">
              {networkStatus.isDevelopment && (
                <div className="flex items-center">
                  <GitBranch className="h-3 w-3 mr-1" />
                  Development
                </div>
              )}
              {networkStatus.isLocalhost && (
                <div className="flex items-center">
                  <Server className="h-3 w-3 mr-1" />
                  Localhost
                </div>
              )}
            </div>
          )}
          
          {/* Connection Details */}
          {networkStatus.online && (
            <>
              <div className="text-sm">
                {formatConnectionInfo()}
              </div>
              
              {/* Speed Indicator */}
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 transition-all duration-300"
                  style={{ 
                    width: `${Math.min(
                      ((networkStatus.averageSpeed || 0) / 100) * 100, 
                      100
                    )}%` 
                  }}
                />
              </div>
            </>
          )}
          
          {/* Last Update Timestamp */}
          <div className="flex justify-between items-center text-xs opacity-75">
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
            <MonitorCheck className="h-4 w-4" />
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default NetworkMonitor;