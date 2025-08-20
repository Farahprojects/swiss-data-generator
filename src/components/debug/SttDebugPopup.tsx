import React from 'react';

interface SttDebugData {
  sampleRate: number;
  payloadSizeKB: number;
  latencyMs: number;
  timestamp: string;
}

interface SttDebugPopupProps {
  data: SttDebugData | null;
  onClose: () => void;
}

export const SttDebugPopup: React.FC<SttDebugPopupProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">STT Debug Data</h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1 text-xs">
        <div><span className="text-gray-400">Sample Rate:</span> {data.sampleRate}Hz</div>
        <div><span className="text-gray-400">Payload Size:</span> {data.payloadSizeKB.toFixed(1)}KB</div>
        <div><span className="text-gray-400">STT Latency:</span> {data.latencyMs}ms</div>
        <div><span className="text-gray-400">Time:</span> {data.timestamp}</div>
      </div>
    </div>
  );
};
