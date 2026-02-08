import os
import json
import re

BASE_DIR = "images/questions"
OUTPUT_FILE = "questions.json"

print("Current dir:", os.getcwd())
print("BASE_DIR exists?", os.path.exists(BASE_DIR))

all_questions = []

for year in os.listdir(BASE_DIR):
    year_path = os.path.join(BASE_DIR, year)
    if not os.path.isdir(year_path):
        continue

    for step in os.listdir(year_path):
        step_path = os.path.join(year_path, step)
        if not os.path.isdir(step_path):
            continue

        # Extract paper/step number
        step_match = re.search(r'S(\d+)', step, re.I)
        if not step_match:
            continue
        paper = int(step_match.group(1))

        # Loop over question images
        for file in os.listdir(step_path):
            q_match = re.search(r'Q(\d+)\.png$', file, re.I)
            if not q_match:
                continue
            question_num = int(q_match.group(1))

            all_questions.append({
                "year": int(year),
                "paper": paper,
                "question": question_num,
                "file": os.path.join(BASE_DIR, year, step, file)
            })

# Sort by year, paper, question
all_questions.sort(key=lambda x: (x['year'], x['paper'], x['question']))

# Write JSON
with open(OUTPUT_FILE, "w") as f:
    json.dump(all_questions, f, indent=2)