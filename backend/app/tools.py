import subprocess
import logging

logger = logging.getLogger("micro_developer")

def execute_code(script: str) -> str:
    """Executes a Python script locally in the terminal and returns the output or error trace"""
    try:
        # We can also notify our visual stream manager here if imported inside
        from app.main import stream_manager
        stream_manager.broadcast({
            "type": "tool_execution",
            "status": "running",
            "code": script
        })
    except ImportError:
        pass

    try:
        result = subprocess.run(
            ["python", "-c", script],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            output = f"Success! Output:\n{result.stdout}"
            try:
                from app.main import stream_manager
                stream_manager.broadcast({
                    "type": "tool_execution",
                    "status": "success",
                    "output": result.stdout
                })
            except ImportError:
                pass
            return output
        else:
            output = f"Error! Error Trace:\n{result.stderr}"
            try:
                from app.main import stream_manager
                stream_manager.broadcast({
                    "type": "tool_execution",
                    "status": "error",
                    "output": result.stderr
                })
            except ImportError:
                pass
            return output

    except subprocess.TimeoutExpired:
        output = "Error! Script execution timed out (30s limit)."
        try:
            from app.main import stream_manager
            stream_manager.broadcast({
                "type": "tool_execution",
                "status": "timeout",
                "output": output
            })
        except ImportError:
            pass
        return output
    except Exception as e:
        output = f"Error executing script: {str(e)}"
        try:
            from app.main import stream_manager
            stream_manager.broadcast({
                "type": "tool_execution",
                "status": "error",
                "output": output
            })
        except ImportError:
            pass
        return output
