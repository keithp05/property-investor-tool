# api.py (or update llm_orchestrator.py with this structure)
from typing import Annotated, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
import uvicorn
import asyncio # Needed for running async operations

# Import the necessary functions from the updated llm_orchestrator.py
from llm_orchestrator import orchestrate_code_review, fetch_code_from_github

# --- 1. FastAPI Setup ---
app = FastAPI(title="Multi-LLM Code Review Agent")

# --- 2. API Endpoint for External Code Review ---
@app.post("/review-external-code/")
async def review_external_code(
    prompt: Annotated[str, Form(...)], # Required field
    github_link: Annotated[Optional[str], Form(...)] = None,
    uploaded_file: Annotated[Optional[UploadFile], File(...)] = None,
):
    """
    Accepts an uploaded file or a GitHub link, and sends the code to 
    ChatGPT for review and error correction.
    """
    code_content = ""
    
    # 1. Determine Source (Priority: GitHub Link > Uploaded File)
    if github_link:
        # Call the synchronous function in an executor thread to avoid blocking the FastAPI event loop
        code_content = await asyncio.to_thread(fetch_code_from_github, github_link)
        
    elif uploaded_file:
        # Read file content as bytes, then decode to string
        try:
            content_bytes = await uploaded_file.read()
            code_content = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Could not decode file content as UTF-8 text.")
    
    else:
        # If neither a link nor a file is provided
        raise HTTPException(status_code=400, detail="No code source provided. Please provide a GitHub link or upload a file.")

    # 2. Check for errors from fetching the code
    if code_content.startswith("Error"):
        # The fetch function returns an error string on failure
        raise HTTPException(status_code=500, detail=code_content)
    
    # 3. Pass the fetched code to the review agent
    results = orchestrate_code_review(code_content, prompt)
    
    # 4. Return results
    return {
        "status": "success",
        "input_source": uploaded_file.filename if uploaded_file else github_link,
        "input_prompt": prompt,
        "code_to_review": code_content[:200] + "..." if len(code_content) > 200 else code_content,
        "review_result": results.get("review_summary_chatgpt")
    }

# --- 3. Entry Point to Run the Server ---
if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)