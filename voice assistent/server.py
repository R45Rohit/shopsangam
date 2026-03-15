from flask import Flask, request, Response, stream_with_context, send_from_directory
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__, static_folder=".")
CORS(app)

NVIDIA_API_KEY = "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"
INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL = "google/gemma-3-27b-it"

SYSTEM_PROMPT = """You are an intelligent AI Voice Assistant embedded inside a website.

Your job is to analyze the complete website content including:
- Page text and structure
- Navigation elements
- Product listings
- UI/UX elements
- Loading experience
- User journey and calls to action
- Content clarity and SEO friendliness
- Personalization opportunities

When a user speaks or asks anything, you must:
1. Understand the user's intent clearly.
2. Analyze the current page context provided.
3. Provide smart, actionable suggestions in simple human language.

Your suggestions should cover:
- UX improvements (navigation confusion, too many clicks, unclear buttons)
- Product discovery improvements
- Content clarity improvements
- Conversion optimization ideas
- Performance issues (slow loading, heavy design)
- Personalization opportunities
- AI automation opportunities
- Checkout friction reduction
- Inventory / recommendation insights

Respond in a short, actionable, insightful, conversational tone.
- If user asks a general question → answer normally
- If user asks an improvement question → give 3-5 structured suggestions with bullet points
- If user seems confused → guide them step-by-step

Always behave like a smart product manager + UX expert + AI consultant combined.
Never hallucinate data. If information is missing → ask a clarifying question.
Keep responses concise — ideally under 150 words unless the question demands more detail."""


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    page_context = data.get("page_context", "")

    if not user_message:
        return {"error": "No message provided"}, 400

    # Build contextual user message
    if page_context:
        contextual_message = f"""[Page Context]
URL: {page_context.get('url', 'Unknown')}
Title: {page_context.get('title', 'Unknown')}
Page Content (truncated): {page_context.get('text', '')[:2000]}

[User Question]
{user_message}"""
    else:
        contextual_message = user_message

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": contextual_message}
        ],
        "max_tokens": 512,
        "temperature": 0.20,
        "top_p": 0.70,
        "stream": True
    }

    def generate():
        try:
            with requests.post(INVOKE_URL, headers=headers, json=payload, stream=True, timeout=60) as r:
                for line in r.iter_lines():
                    if line:
                        decoded = line.decode("utf-8")
                        if decoded.startswith("data: "):
                            chunk = decoded[6:]
                            if chunk == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                obj = json.loads(chunk)
                                delta = obj["choices"][0]["delta"]
                                content = delta.get("content", "")
                                if content:
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue
        except requests.exceptions.RequestException as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


if __name__ == "__main__":
    print("AI Voice Assistant Server running at http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000, threaded=True)
