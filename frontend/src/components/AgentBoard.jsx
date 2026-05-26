import React from 'react';

export default function AgentBoard({ activeAgent, programmerStatus, testerStatus, programmerTask, testerTask }) {
  const isLoopActive = activeAgent !== 'idle';

  return (
    <div className="agents-board-container">
      <div className="agent-cards-row">
        {/* Connection loop pulsing line */}
        <div className={`agent-connector-line ${isLoopActive ? 'active' : ''}`} />

        {/* Programmer Card */}
        <div className={`agent-card programmer ${activeAgent === 'programmer' ? 'active' : ''}`}>
          <div className="agent-header">
            <span className="agent-title">Senior Programmer</span>
            <span className="agent-indicator">
              {activeAgent === 'programmer' ? 'Coding...' : programmerStatus}
            </span>
          </div>
          <p className="agent-task">
            {programmerTask || "Waiting to build code..."}
          </p>
        </div>

        {/* Tester Card */}
        <div className={`agent-card tester ${activeAgent === 'tester' ? 'active' : ''}`}>
          <div className="agent-header">
            <span className="agent-title">Senior QA Tester</span>
            <span className="agent-indicator">
              {activeAgent === 'tester' ? 'Testing...' : testerStatus}
            </span>
          </div>
          <p className="agent-task">
            {testerTask || "Waiting to run tests..."}
          </p>
        </div>
      </div>
    </div>
  );
}
