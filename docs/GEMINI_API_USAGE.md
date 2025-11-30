# Gemini API Usage Instructions for Manus Platform

## 🚨 MANDATORY: Gemini API for Code Generation and Reasoning

**This is a REQUIRED protocol for all AI agents working on TERP via the Manus platform.**

### When to Use Gemini API

AI agents on the Manus platform **MUST** use the Google Gemini API for:

1. **Code Generation** - Writing new code, refactoring existing code, or creating scripts
2. **Complex Reasoning** - Multi-step analysis, architectural decisions, or system design
3. **Bulk Operations** - Processing multiple files, generating test cases, or batch refactoring
4. **Documentation Generation** - Creating comprehensive documentation from code or specifications

### Standard Setup

```python
#!/usr/bin/env python3
"""
Standard Gemini API setup for TERP development tasks
"""

import os
from google import genai
from google.genai import types

# Initialize the client (API key is pre-configured in environment)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Standard model configuration
MODEL_ID = "gemini-2.0-flash-exp"  # Use latest flash model for speed

# Example usage for code generation
def generate_code(prompt: str) -> str:
    """Generate code using Gemini API"""
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,  # Lower temperature for more deterministic code
            max_output_tokens=8192,
        )
    )
    return response.text

# Example usage for reasoning/analysis
def analyze_system(context: str, question: str) -> str:
    """Perform complex reasoning using Gemini API"""
    prompt = f"""Context: {context}

Question: {question}

Provide a detailed analysis with step-by-step reasoning."""
    
    response = client.models.generate_content(
        model=MODEL_ID,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.4,  # Slightly higher for creative reasoning
            max_output_tokens=8192,
        )
    )
    return response.text
```

### Installation

The Gemini SDK is pre-installed in the Manus environment. If needed:

```bash
pip3 install google-genai
```

### Environment Variables

The `GEMINI_API_KEY` environment variable is automatically configured in the Manus platform. No manual setup required.

### Best Practices

1. **Always use Gemini for code generation** - Don't write code manually when Gemini can generate it
2. **Use appropriate temperature** - Lower (0.1-0.3) for code, higher (0.4-0.7) for creative tasks
3. **Set reasonable token limits** - Default to 8192, increase only if needed
4. **Handle errors gracefully** - Wrap API calls in try/except blocks
5. **Log API usage** - Track what tasks use Gemini for audit purposes

### Model Selection

- **gemini-2.0-flash-exp** - Default choice for most tasks (fast, cost-effective)
- **gemini-2.0-pro-exp** - Use for complex reasoning or when flash model is insufficient
- **gemini-1.5-flash** - Fallback if 2.0 models are unavailable

### Example: Complete Script Generation

```python
#!/usr/bin/env python3
"""
Example: Using Gemini to generate a complete Python script
"""

import os
from google import genai
from google.genai import types

def generate_script_with_gemini(task_description: str, output_path: str):
    """Generate a complete Python script using Gemini API"""
    
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    prompt = f"""You are an expert Python developer. Create a complete, production-ready Python script for the following task:

{task_description}

Requirements:
- Include proper error handling
- Add comprehensive docstrings
- Follow PEP 8 style guidelines
- Include argparse for command-line arguments
- Add logging with the logging module
- Make the script executable with proper shebang

Provide ONLY the complete Python code, no explanations."""

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=8192,
        )
    )
    
    # Extract code from response
    code = response.text
    if '```python' in code:
        code = code.split('```python')[1].split('```')[0].strip()
    elif '```' in code:
        code = code.split('```')[1].split('```')[0].strip()
    
    # Write to file
    with open(output_path, 'w') as f:
        f.write(code)
    
    # Make executable
    os.chmod(output_path, 0o755)
    
    print(f"✅ Script generated: {output_path}")
    return code

# Usage
if __name__ == "__main__":
    task = "Create a script that validates all TypeScript files in a directory"
    generate_script_with_gemini(task, "/tmp/validate_typescript.py")
```

### Compliance

**Failure to use Gemini API for code generation and complex reasoning tasks is a protocol violation.**

All AI agents must:
- ✅ Use Gemini API for code generation
- ✅ Use Gemini API for multi-step reasoning
- ✅ Log Gemini API usage in task reports
- ❌ Never write complex code manually when Gemini can generate it
- ❌ Never perform complex analysis manually when Gemini can assist

### Documentation

For full Gemini API documentation, see: https://ai.google.dev/gemini-api/docs

---

**Last Updated:** November 30, 2025  
**Applies To:** All AI agents on Manus platform working on TERP
