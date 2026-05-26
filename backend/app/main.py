import os
import sys
import uuid
import queue
import threading
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from crewai import Crew

from app.agents import get_llm, create_programmer_agent, create_tester_agent, execute_code_tool
from app.tasks import create_tasks

app = FastAPI(title="Micro Developer API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptRequest(BaseModel):
    prompt: str

class StreamManager:
    def __init__(self):
        self.queues = {}
        self.loops = {}

    def get_queue(self, session_id: str):
        if session_id not in self.queues:
            self.queues[session_id] = asyncio.Queue()
            try:
                self.loops[session_id] = asyncio.get_running_loop()
            except RuntimeError:
                # Fallback if no loop is running
                self.loops[session_id] = None
        return self.queues[session_id]

    def delete_queue(self, session_id: str):
        if session_id in self.queues:
            del self.queues[session_id]
        if session_id in self.loops:
            del self.loops[session_id]

    def broadcast(self, session_id: str, data: dict = None):
        # Support calling as broadcast(data) or broadcast(session_id, data)
        if data is None and isinstance(session_id, dict):
            data = session_id
            session_id = getattr(thread_local, "session_id", None)
            
        if not session_id:
            return

        if session_id in self.queues:
            loop = self.loops.get(session_id)
            if loop:
                loop.call_soon_threadsafe(self.queues[session_id].put_nowait, data)

stream_manager = StreamManager()

# Thread-local storage to track session_id for standard output redirects
thread_local = threading.local()

class StdoutRedirector:
    def __init__(self, original_stdout):
        self.original_stdout = original_stdout

    def write(self, string):
        self.original_stdout.write(string)
        self.original_stdout.flush()
        # If thread has a session_id, broadcast the line
        session_id = getattr(thread_local, "session_id", None)
        if session_id and string.strip():
            # Send standard console logs
            try:
                stream_manager.broadcast(session_id, {
                    "type": "console_log",
                    "message": string.strip()
                })
            except Exception:
                pass

    def flush(self):
        self.original_stdout.flush()

# Redirect stdout to capture all prints/agent conversations
sys.stdout = StdoutRedirector(sys.stdout)

# Modify app.tools tool execution callback to broadcast to the current session
def broadcast_tool_execution(data: dict):
    session_id = getattr(thread_local, "session_id", None)
    if session_id:
        stream_manager.broadcast(session_id, data)

# Let's patch the tools.py execution callback
from app import tools
tools.stream_manager = type('Dummy', (object,), {
    'broadcast': lambda self, data: broadcast_tool_execution(data)
})()

def run_crew_job(session_id: str, prompt: str):
    # Set the session ID on this thread
    thread_local.session_id = session_id
    
    try:
        stream_manager.broadcast(session_id, {
            "type": "status",
            "status": "starting",
            "message": "Initializing LLM and Agents..."
        })

        llm = get_llm()
        programmer = create_programmer_agent(llm)
        tester = create_tester_agent(llm, [execute_code_tool])
        tasks = create_tasks(programmer, tester, prompt)
        
        crew = Crew(
            agents=[programmer, tester],
            tasks=tasks,
            verbose=True
        )

        stream_manager.broadcast(session_id, {
            "type": "status",
            "status": "running",
            "message": "Crew started. Programmer designing the code..."
        })

        result = crew.kickoff(inputs={"prompt": prompt})

        stream_manager.broadcast(session_id, {
            "type": "status",
            "status": "completed",
            "result": str(result),
            "message": "Success! The agent crew finished executing."
        })
    except Exception as e:
        stream_manager.broadcast(session_id, {
            "type": "status",
            "status": "failed",
            "message": f"Execution failed: {str(e)}"
        })
    finally:
        # We can close the queue after a brief delay
        pass

@app.post("/api/kickoff")
def kickoff(request: PromptRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())
    background_tasks.add_task(run_crew_job, session_id, request.prompt)
    return {"session_id": session_id}

@app.get("/api/stream/{session_id}")
async def stream(session_id: str):
    async def event_generator():
        q = stream_manager.get_queue(session_id)
        try:
            while True:
                # Get item from queue
                data = await q.get()
                # Yield SSE message
                import json
                yield f"data: {json.dumps(data)}\n\n"
                
                # Check if session is completed or failed to break
                if data.get("type") == "status" and data.get("status") in ["completed", "failed"]:
                    break
        except asyncio.CancelledError:
            pass
        finally:
            stream_manager.delete_queue(session_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Local sandbox manual runner endpoint
class RunCodeRequest(BaseModel):
    code: str

@app.post("/api/run")
def run_code(request: RunCodeRequest):
    from app.tools import execute_code
    output = execute_code(request.code)
    return {"output": output}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
