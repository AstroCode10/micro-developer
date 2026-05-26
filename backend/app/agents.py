import os
from crewai import Agent, LLM
from crewai.tools import tool
from dotenv import load_dotenv
from app.tools import execute_code

load_dotenv()

# Define the local execute code tool for CrewAI
@tool("Execute Python Script")
def execute_code_tool(script: str) -> str:
    """Executes a Python script locally in the terminal and returns the output or error trace"""
    return execute_code(script)

def get_llm():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        # Fallback to empty if not found, crewai will raise appropriate error
        api_key = ""
    return LLM(
        model="openrouter/z-ai/glm-4.5-air:free",
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )

def create_programmer_agent(llm):
    return Agent(
        role="Senior Python Programmer",
        goal="Write clear, efficient, and well-documented Python code to solve the problem given by the prompt.",
        backstory="You are a highly-skilled senior Python programmer with decades of experience developing clear, "
                  "memory and space efficient, and easy-to-understand code. You use chain-of-thought reasoning to "
                  "break a problem down and then write the relevant code based on your abstraction. Ensure to use "
                  "comments to explain your code. Do not invent syntax or libraries that do not exist. Only use "
                  "standard Python libraries or well-known third-party libraries and accurate syntax.",
        llm=llm,
        verbose=True
    )

def create_tester_agent(llm, tools):
    return Agent(
        role="Senior QA Tester",
        goal="Test code using the execution tool and force fixes if it fails based on the error message.",
        backstory="You are a professional senior QA tester with countless testing, debugging, and fixing code. "
                  "You ensure the code performs the required function with no logic, syntax, runtime or any "
                  "other error. You use the execution tool to run the code and if it fails, you analyze the "
                  "error message, identify the issue, and then instruct the programmer to fix the code. You "
                  "repeat this process until the code runs successfully without any errors.",
        tools=tools,
        llm=llm,
        verbose=True
    )
