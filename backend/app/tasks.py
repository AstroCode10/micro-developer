from crewai import Task

def create_tasks(programmer, tester, prompt):
    write_code = Task(
        description=prompt,
        expected_output="A clean Python script that solves the problem described in the prompt, "
                        "with clear comments explaining the code.",
        agent=programmer
    )

    test_code = Task(
        description="Take the code, run it using the tool, and verify it works. If it fails, feed the error"
                    "back to the developer to fix. You should repeat this process until the code runs successfully"
                    "without any logic, syntax, runtime or any other type of errors.",
        expected_output="The final working code along with its successful terminal output presented separately.",
        agent=tester,
        context=[write_code]
    )
    
    return [write_code, test_code]
