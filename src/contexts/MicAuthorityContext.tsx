import React, { createContext, useContext, ReactNode } from 'react';

interface MicAuthorityData {
  micIsOn: boolean;
  audioLevel: number;
  isProcessing: boolean;
}

const MicAuthorityContext = createContext<MicAuthorityData | null>(null);

export const MicAuthorityProvider: React.FC<{ 
  children: ReactNode; 
  micAuthority: MicAuthorityData;
}> = ({ children, micAuthority }) => {
  return (
    <MicAuthorityContext.Provider value={micAuthority}>
      {children}
    </MicAuthorityContext.Provider>
  );
};

export const useMicAuthorityContext = () => {
  const context = useContext(MicAuthorityContext);
  if (!context) {
    return { micIsOn: false, audioLevel: 0, isProcessing: false };
  }
  return context;
};
