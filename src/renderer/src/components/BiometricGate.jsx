import React, { useState, useEffect } from 'react';

export default function BiometricGate({ username, onSuccess }) {
  const [status, setStatus] = useState('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasLinkedDevice, setHasLinkedDevice] = useState(false);

  useEffect(() => {
    if (username) {
      const token = localStorage.getItem(`sec_token_${username}`);
      if (token) setHasLinkedDevice(true);
    }
  }, [username]);

  const handleBiometricAuth = async () => {
    setStatus('SCANNING');
    setErrorMsg('');
    try {
      const encryptedToken = localStorage.getItem(`sec_token_${username}`);
      if (!encryptedToken) throw new Error("No hardware token found.");

      const result = await window.security.verifyHardware({ 
        username, 
        encryptedTokenBase64: encryptedToken 
      });

      if (result.success) {
        setStatus('SUCCESS');
        setTimeout(() => onSuccess(result.user), 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setStatus('ERROR');
      setErrorMsg(err.message || "Biometric verification failed.");
    }
  };

  const linkDevice = async () => {
    if (!username) {
      setErrorMsg("Enter username first");
      return;
    }
    const result = await window.security.linkHardware(username);
    if (result.success) {
      localStorage.setItem(`sec_token_${username}`, result.encryptedToken);
      setHasLinkedDevice(true);
    } else {
      setErrorMsg(result.error);
    }
  };

  if (!username) return <div className="text-xs text-gray-500 font-mono mt-4">ENTER ID TO ACCESS HARDWARE LINK</div>;

  return (
    <div className="mt-6 border-t border-accent/20 pt-4 font-mono flex flex-col items-center w-full">
      <div className="h-6 text-xs text-center mb-2">
        {status === 'SCANNING' && <span className="text-accent animate-pulse">VERIFYING BIOMETRICS...</span>}
        {status === 'SUCCESS' && <span className="text-green-500">CLEARANCE GRANTED</span>}
        {status === 'ERROR' && <span className="text-red-500">{errorMsg}</span>}
      </div>

      {hasLinkedDevice ? (
        <button type="button" onClick={handleBiometricAuth} disabled={status === 'SCANNING' || status === 'SUCCESS'}
          className="w-full py-2 bg-accent/10 hover:bg-accent/20 border border-accent/50 text-accent transition-all text-xs tracking-widest">
          INITIATE BIOMETRIC SCAN
        </button>
      ) : (
        <button type="button" onClick={linkDevice}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 transition-all text-xs tracking-widest">
          LINK HARDWARE KEY TO THIS ID
        </button>
      )}
    </div>
  );
}