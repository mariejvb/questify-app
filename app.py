# =================================
#  1. IMPORTS & INITIALIZATION
# =================================

import os
import json
import random
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# load_dotenv() reads the .env file and loads environment variables (like the API key)
# into the application's environment. This is a secure way to handle secret keys.
load_dotenv()

# Initialize the Flask application.
app = Flask(__name__)

# CORS (Cross-Origin Resource Sharing) is enabled to allow the frontend (running on a different port)
# to make requests to this backend server. This is a crucial security feature.
CORS(app)

# =================================
#  2. AI MODEL CONFIGURATION
# =================================

# This 'try...except' block handles the initialization of the Google AI model.
# It's wrapped in error handling in case the API key is missing or invalid.
try:
    # Retrieves the API key from the environment variables loaded from the .env file.
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("API key not found. Ensure the GOOGLE_API_KEY is set in your .env file.")
    
    # Configures the genai library with the provided API key.
    genai.configure(api_key=api_key)
    
    # Creates an instance of the generative model that will be used for all AI calls.
    # 'gemini-1.5-flash' is chosen for its balance of speed and capability.
    model = genai.GenerativeModel(model_name="gemini-1.5-flash")
except Exception as e:
    # If any part of the setup fails, it prints an error and sets the model to None.
    # The API endpoints will check if 'model' is None and return an error if so.
    print(f"Error initializing AI model: {e}")
    model = None


# =================================
#  3. API ENDPOINTS
# =================================

# --- ENDPOINT 1: GENERATE THE INITIAL LIST OF QUESTS ---
# Defines the route for generating a new set of tasks for a main goal.
# It only accepts POST requests.
@app.route('/generate-quests', methods=['POST'])
def generate_quests_endpoint():
    # First, check if the AI model was successfully initialized.
    if model is None:
        return jsonify({"error": "AI model is not available."}), 503 # 503 Service Unavailable

    # Get the JSON data sent from the frontend.
    data = request.get_json()
    goal = data.get('goal')

    if not goal:
        return jsonify({'error': 'A goal must be provided.'}), 400 # 400 Bad Request

    # This multi-line string is the prompt that will be sent to the AI.
    # It's carefully engineered to command the AI to return data in a specific JSON format.
    prompt = f"""
    You are a productivity assistant for a gamified app. Break down the user's goal into exactly 3 actionable mini-quests.
    The response MUST be a valid JSON object with a single key "quests" which holds a list of 3 quest objects.
    Each object must have exactly three keys:
    1. "text": A string containing the quest description. The description must be concise and actionable, ideally a single sentence (2 sentences maximum).
    2. "difficulty": A string that is ONLY one of "Easy", "Medium", or "Hard".
    3. "xp": An integer representing the reward. Assign 20 for "Easy", 35 for "Medium", or 50 for "Hard".
    Do not add any other text, explanations, or markdown.
    User Goal: "{goal}"
    """
    try:
        # Sends the prompt to the AI model and gets the response.
        response = model.generate_content(prompt)
        # Cleans up the response text to ensure it's valid JSON, removing markdown code fences.
        response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        data = json.loads(response_text)
        quests = data.get("quests", [])
        
        # A simple validation to ensure the AI's response matches the expected structure.
        if len(quests) != 3 or not all('text' in q and 'xp' in q for q in quests):
             raise ValueError("AI did not return the correct data structure.")
        
        return jsonify({'quests': quests})
    except Exception as e:
        print(f"An error occurred during quest generation: {e}")
        return jsonify({'error': 'Failed to generate quests from AI.'}), 500 # 500 Internal Server Error


# --- ENDPOINT 2: REFRESH A SINGLE QUEST ---
# Defines the route for replacing a single unwanted task.
@app.route('/refresh-quest', methods=['POST'])
def refresh_quest_endpoint():
    if model is None:
        return jsonify({"error": "AI model is not available."}), 503

    data = request.get_json()
    goal = data.get('goal')
    existing_quests = data.get('existing_quests', [])
    
    if not goal or not existing_quests:
        return jsonify({'error': 'Missing required data for refresh.'}), 400

    # This logic uses Python's 'random' library to ensure a truly random difficulty selection,
    # rather than relying on the AI to be random.
    difficulties = ["Easy", "Medium", "Hard"]
    chosen_difficulty = random.choice(difficulties)
    
    xp_map = {"Easy": 20, "Medium": 35, "Hard": 50}
    chosen_xp = xp_map[chosen_difficulty]
    
    # Extracts just the text of existing quests to tell the AI what to avoid repeating.
    existing_quest_texts = [q.get('text') for q in existing_quests if q.get('text')]

    # This prompt is different; it commands the AI to create a quest of a specific difficulty.
    prompt = f"""
    You are a productivity assistant. Your task is to generate a single new "mini-quest" to help a user achieve their main goal.
    
    The quest text MUST be concise and actionable, ideally a single sentence (2 sentences maximum).
    Crucially, you MUST generate a quest with a difficulty of "{chosen_difficulty}".
    The new quest MUST NOT be similar to any of the quests in the "existing_quests" list.

    The response MUST be a single, valid JSON object. It must have a "text" key containing the quest description.
    Do not add any other text, explanations, or markdown.

    User's Main Goal: "{goal}"
    Existing Quests (do not repeat these): {json.dumps(existing_quest_texts)}
    """
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        ai_generated_data = json.loads(response_text)
        
        # Constructs the final response object using the reliable Python variables for difficulty and XP.
        # This prevents the AI from "hallucinating" incorrect values.
        new_quest = {
            "text": ai_generated_data.get("text"),
            "difficulty": chosen_difficulty,
            "xp": chosen_xp
        }
        
        return jsonify({'new_quest': new_quest})
    except Exception as e:
        print(f"An error occurred during refresh: {e}")
        return jsonify({'error': 'Failed to generate refreshed quest.'}), 500


# =================================
#  4. APPLICATION RUNNER
# =================================

# This standard Python construct ensures that the Flask development server is only run
# when the script is executed directly (not when it's imported as a module).
if __name__ == '__main__':
    # Starts the development server. 'debug=True' enables auto-reloading when the code changes.
    app.run(debug=True, port=5000)