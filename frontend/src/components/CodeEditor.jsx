import React, { useState } from 'react';

export default function CodeEditor({ code, onRunSandbox, isRunningCode, sandboxOutput, isError }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-viewer-panel">
      <div className="code-header">
        <div className="code-title">
          <span className="code-icon">⚡</span>
          <span>Final Verified Script</span>
        </div>
        
        {code && (
          <div className="code-actions">
            <button className="btn-icon" onClick={handleCopy}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            <button 
              className="btn-icon btn-run" 
              onClick={() => onRunSandbox(code)}
              disabled={isRunningCode}
            >
              {isRunningCode ? 'Running...' : 'Run in Sandbox'}
            </button>
          </div>
        )}
      </div>

      <div className="code-container">
        {code ? (
          <textarea
            className="code-textarea"
            value={code}
            readOnly
          />
        ) : (
          <div className="empty-state">
            <span className="empty-state-icon">🤖</span>
            <h3>No Code Generated Yet</h3>
            <p>Enter a programming prompt to start the autonomous self-correcting agent flow.</p>
          </div>
        )}
      </div>

      {code && (
        <div className="sandbox-output-panel">
          <div className="sandbox-output-header">
            <span>Sandbox execution stdout</span>
            <span>Local Python</span>
          </div>
          <div className={`sandbox-output-body ${isError ? 'error' : ''}`}>
            {sandboxOutput || 'Click "Run in Sandbox" to execute the verified code locally.'}
          </div>
        </div>
      )}
    </div>
  );
}
