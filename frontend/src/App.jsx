import React, { useState, useEffect } from 'react';
import AgentBoard from './components/AgentBoard';
import TerminalLog from './components/TerminalLog';
import CodeEditor from './components/CodeEditor';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [logs, setLogs] = useState([]);
  
  // Agent Board States
  const [activeAgent, setActiveAgent] = useState('idle'); // 'programmer', 'tester', 'idle'
  const [programmerStatus, setProgrammerStatus] = useState('Idle');
  const [testerStatus, setTesterStatus] = useState('Idle');
  const [programmerTask, setProgrammerTask] = useState('');
  const [testerTask, setTesterTask] = useState('');

  // Code & Sandbox execution States
  const [generatedCode, setGeneratedCode] = useState('');
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState('');
  const [isSandboxError, setIsSandboxError] = useState(false);
  const [appError, setAppError] = useState('');

  const startKickoff = async () => {
    if (!prompt.trim()) return;

    // Reset UI states
    setSessionActive(true);
    setLogs([]);
    setGeneratedCode('');
    setSandboxOutput('');
    setAppError('');
    setActiveAgent('programmer');
    setStatus('Initializing');
    setProgrammerStatus('Thinking');
    setTesterStatus('Idle');
    setProgrammerTask('Analyzing programming prompt...');
    setTesterTask('Standing by to test...');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/kickoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('API server error');
      const { session_id } = await response.json();

      // Connect to the Server-Sent Events stream
      const eventSource = new EventSource(`http://127.0.0.1:8000/api/stream/${session_id}`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setStatus(data.message);
          
          if (data.status === 'completed') {
            setActiveAgent('idle');
            setProgrammerStatus('Completed');
            setTesterStatus('Completed');
            setSessionActive(false);
            eventSource.close();
            
            // Extract code blocks from the markdown output
            const codeBlockRegex = /```python([\s\S]*?)```/g;
            const match = codeBlockRegex.exec(data.result);
            if (match && match[1]) {
              setGeneratedCode(match[1].trim());
            } else {
              setGeneratedCode(data.result);
            }
            
            setLogs((prev) => [...prev, { type: 'success', message: '✓ Generation finished successfully!' }]);
          } else if (data.status === 'failed') {
            setActiveAgent('idle');
            setSessionActive(false);
            setAppError(data.message);
            eventSource.close();
            setLogs((prev) => [...prev, { type: 'error', message: `✗ Agent execution failed: ${data.message}` }]);
          }
        } 
        
        else if (data.type === 'console_log') {
          const rawMessage = data.message;
          let logType = 'default';

          // Visual transition detection based on console logs
          if (rawMessage.includes('Senior Python Programmer')) {
            setActiveAgent('programmer');
            setProgrammerStatus('Coding');
            setProgrammerTask(rawMessage.replace(/^[^\w]*/, '')); // Strip ansi characters
            logType = 'programmer';
          } else if (rawMessage.includes('Senior QA Tester')) {
            setActiveAgent('tester');
            setTesterStatus('QA Verification');
            setTesterTask(rawMessage.replace(/^[^\w]*/, ''));
            logType = 'tester';
          } else if (rawMessage.includes('execute_python_script') || rawMessage.includes('tool')) {
            logType = 'system';
          }

          setLogs((prev) => [...prev, { type: logType, message: rawMessage }]);
        } 
        
        else if (data.type === 'tool_execution') {
          if (data.status === 'running') {
            setActiveAgent('tester');
            setTesterStatus('Executing Code');
            setTesterTask('Running Python script in sandboxed subprocess...');
            setLogs((prev) => [...prev, { type: 'system', message: '⚙ Sandboxed subprocess execution triggered.' }]);
          } else if (data.status === 'success') {
            setLogs((prev) => [...prev, { type: 'success', message: `✓ Script ran successfully. Output:\n${data.output}` }]);
          } else if (data.status === 'error') {
            setLogs((prev) => [...prev, { type: 'error', message: `⚠️ Script failed. Capture traceback:\n${data.output}` }]);
          }
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        setAppError('Connection to server event stream broken.');
        setLogs((prev) => [...prev, { type: 'error', message: 'Connection to stream broken.' }]);
        setSessionActive(false);
        eventSource.close();
      };

    } catch (err) {
      setAppError(`Spawning error: ${err.message}`);
      setLogs((prev) => [...prev, { type: 'error', message: `Error spawning agent crew: ${err.message}` }]);
      setSessionActive(false);
    }
  };

  const handleRunSandbox = async (codeToRun) => {
    setIsRunningCode(true);
    setSandboxOutput('Executing code...');
    setIsSandboxError(false);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToRun }),
      });

      if (!response.ok) throw new Error('Sandbox runner failed');
      const data = await response.json();
      
      setSandboxOutput(data.output);
      if (data.output.startsWith('Error!')) {
        setIsSandboxError(true);
      }
    } catch (err) {
      setSandboxOutput(`Error executing sandbox: ${err.message}`);
      setIsSandboxError(true);
    } finally {
      setIsRunningCode(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="brand-section">
          <div className="logo-icon">🤖</div>
          <div>
            <h1>Micro Developer</h1>
            <div className="brand-subtitle">Self-Correcting Code Generator</div>
          </div>
        </div>
        <div className="status-badge">
          <span className={`status-dot ${sessionActive ? 'active' : ''}`} />
          <span>Status: {status}</span>
        </div>
      </header>

      {appError && (
        <div className="error-banner">
          <div className="error-banner-icon">⚠️</div>
          <div className="error-banner-content">
            <strong>Execution Error Occurred:</strong>
            <p>{appError}</p>
          </div>
          <button className="error-banner-close" onClick={() => setAppError('')}>×</button>
        </div>
      )}

      <main className="dashboard-grid">
        {/* Left Side: Input Prompt, Visual Board, Terminal Logs */}
        <div className="control-section">
          <div className="panel">
            <div className="prompt-box">
              <label htmlFor="prompt-input">What problem would you like to solve?</label>
              <div className="input-container">
                <textarea
                  id="prompt-input"
                  placeholder="e.g. Write a Python script that calculates the Fibonacci sequence up to the 10th element."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={sessionActive}
                />
                <button
                  className="btn-generate"
                  onClick={startKickoff}
                  disabled={sessionActive || !prompt.trim()}
                >
                  {sessionActive ? 'Generating...' : 'Kickoff Crew'}
                </button>
              </div>
            </div>

            <AgentBoard
              activeAgent={activeAgent}
              programmerStatus={programmerStatus}
              testerStatus={testerStatus}
              programmerTask={programmerTask}
              testerTask={testerTask}
            />
          </div>

          <div className="panel" style={{ flex: 1 }}>
            <TerminalLog logs={logs} />
          </div>
        </div>

        {/* Right Side: Generated Code & Subprocess Sandbox Output */}
        <div className="panel">
          <CodeEditor
            code={generatedCode}
            onRunSandbox={handleRunSandbox}
            isRunningCode={isRunningCode}
            sandboxOutput={sandboxOutput}
            isError={isSandboxError}
          />
        </div>
      </main>
    </div>
  );
}
