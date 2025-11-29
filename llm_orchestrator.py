##llm_orchestrator.py
import os
import requests
from openai import OpenAI
from anthropic import Anthropic

# --- 1. Initialize Clients (Moved outside functions for global use) ---
try:
    # Clients automatically look for keys in environment variables
    openai_client = OpenAI()
    # Using the latest recommended Sonnet model alias
    CLAUDE_MODEL = "claude-sonnet-4-5"
    anthropic_client = Anthropic()
    print("API Clients initialized successfully.")
except Exception as e:
    # This will catch errors if the keys are not found in the environment variables
    print(f"\n[!!! INITIALIZATION ERROR !!!] Ensure OPENAI_API_KEY and ANTHROPIC_API_KEY are set.")
    print(f"Details: {e}\n")
    # Exit if we can't initialize clients, as the script is useless without them
    exit(1)


# --- 2. Code Review Function (Agent 2: ChatGPT - Used for all reviews now) ---
def review_code_with_chatgpt(code: str, prompt_description: str) -> str:
    """
    Uses ChatGPT to review, error-check, and correct the provided code block.
    """
    print("Agent 2: ChatGPT reviewing code...")
    
    review_prompt = (
        "You are a meticulous Senior Code Auditor. Review the following code. "
        "Check for bugs, security vulnerabilities, efficiency, and Pythonic best practices. "
        "The user provided this description: '" + prompt_description + "'."
        "Provide a clear 'VERDICT: PASS' or 'VERDICT: FAIL' at the top of your response. "
        "If the verdict is 'FAIL', provide the corrected, final code after your critique."
        f"\n\nCODE TO REVIEW:\n```python\n{code}\n```"
    )
    
    # Using the powerful GPT-4o model for review
    model = "gpt-4o" 
    
    try:
        completion = openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a senior software engineer and security auditor."},
                {"role": "user", "content": review_prompt}
            ]
        )
        return completion.choices[0].message.content
        
    except Exception as e:
        print(f"\n[!!! CHATGPT API ERROR !!!] Details: {e}\n")
        return f"Error during ChatGPT review: {e}"


# --- 3. GitHub Fetching Logic ---
def fetch_code_from_github(github_url: str) -> str:
    """
    Converts a standard GitHub file URL to a raw URL and fetches the content.
    """
    # Check if it's a standard GitHub file URL
    if 'github.com' in github_url and '/blob/' in github_url:
        # Convert to raw.githubusercontent.com URL
        raw_url = github_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
    # Check if it's already a raw URL
    elif 'raw.githubusercontent.com' in github_url:
        raw_url = github_url
    else:
        # Return an error message that can be caught later
        return "Error: Invalid GitHub file URL format. Must link directly to a file."
    
    try:
        response = requests.get(raw_url, timeout=10) # Added a timeout for safety
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        print(f"Successfully fetched code from: {raw_url}")
        # Decode the content
        return response.text
    except requests.exceptions.HTTPError as e:
        return f"Error fetching code from GitHub (HTTP Error: {e.response.status_code}). Check the URL and file existence."
    except requests.exceptions.RequestException as e:
        return f"Error connecting to GitHub: {e}"


# --- 4. Orchestration Function (Now Review-focused) ---
# We keep this for future complex workflows, but it's simpler to call review_code_with_chatgpt 
# directly from the API endpoint for the new file/link feature.
def orchestrate_code_review(code: str, prompt_description: str) -> dict:
    """Runs the review workflow on provided code."""
    
    review_result = review_code_with_chatgpt(code, prompt_description)
    
    # Step 2: Parse and present results
    return {
        "status": "success",
        "review_summary_chatgpt": review_result,
        "final_output": review_result
    }

# --- 5. Example Usage (Cleanup for API Focus) ---
if __name__ == "__main__":
    print("This file is primarily for API functions. Use the FastAPI server (api.py) to test.")
    # The original generation logic is removed as we now focus on external review