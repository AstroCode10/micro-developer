import React, { useEffect, useRef } from 'react';

export default function TerminalLog({ logs }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getLogClass = (type) => {
    switch (type) {
      case 'system': return 'log-line system';
      case 'programmer': return 'log-line programmer';
      case 'tester': return 'log-line tester';
      case 'success': return 'log-line success';
      case 'error': return 'log-line error';
      default: return 'log-line';
    }
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-indicator" />
          <span>Real-time Agent Console Logs</span>
        </div>
      </div>
      <div className="terminal-body">
        {logs.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', marginTop: '4rem' }}>
            Console idle. Send a programming problem to begin the kickoff!
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={getLogClass(log.type)}>
              {log.message}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
