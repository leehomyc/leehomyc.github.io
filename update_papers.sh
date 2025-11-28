#!/bin/bash
# Fetch papers for the last 3 days
echo "Fetching papers..."
today=$(date +%Y-%m-%d)
yesterday=$(date -v-1d +%Y-%m-%d)
daybefore=$(date -v-2d +%Y-%m-%d)

curl -s "https://huggingface.co/api/daily_papers?date=$today" > papers_today.json
curl -s "https://huggingface.co/api/daily_papers?date=$yesterday" > papers_yesterday.json
curl -s "https://huggingface.co/api/daily_papers?date=$daybefore" > papers_daybefore.json

echo "Processing data..."
python3 <<EOF
import json
import requests
from datetime import datetime

API_KEY = "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"

def load_papers(filename):
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except:
        return []

papers_today = load_papers('papers_today.json')
papers_yesterday = load_papers('papers_yesterday.json')
papers_daybefore = load_papers('papers_daybefore.json')

def call_openai(text, task_type):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    if task_type == "translate":
        system_prompt = "You are a helpful assistant. Summarize the following abstract into 3-5 bullet points using plain, easy-to-understand Chinese (Simplified). Format the output as an HTML unordered list (<ul><li>...</li></ul>)."
    elif task_type == "summary":
        system_prompt = "You are a helpful assistant. Summarize the following abstract into 3-5 bullet points using plain, easy-to-understand English. Format the output as an HTML unordered list (<ul><li>...</li></ul>)."
    
    data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"OpenAI API call failed: {e}")
        return None

# Helper to process papers
def process_papers(papers):
    for p in papers:
        try:
            summary = p['paper']['summary']
            
            # Translate to Chinese
            if 'summary_zh' not in p['paper'] or not p['paper']['summary_zh']:
                print(f"Translating {p['paper']['id']}...")
                zh = call_openai(summary, "translate")
                p['paper']['summary_zh'] = zh if zh else "Translation unavailable"
            
            # Generate Summary
            if 'summary_simple' not in p['paper'] or not p['paper']['summary_simple']:
                print(f"Summarizing {p['paper']['id']}...")
                simple = call_openai(summary, "summary")
                p['paper']['summary_simple'] = simple if simple else "Summary unavailable"
                
        except Exception as e:
            print(f"Processing failed for {p['paper']['id']}: {e}")
    return papers

# Today's Top 10
top10_today = papers_today[:10]
top10_today = process_papers(top10_today)

# Recent 3 Days Top 10
all_papers = papers_today + papers_yesterday + papers_daybefore
# Deduplicate by paper ID
seen_ids = set()
unique_papers = []
for p in all_papers:
    pid = p['paper']['id']
    if pid not in seen_ids:
        seen_ids.add(pid)
        unique_papers.append(p)

# Sort by upvotes (descending)
unique_papers.sort(key=lambda x: x['paper']['upvotes'], reverse=True)
top10_recent = unique_papers[:10]
top10_recent = process_papers(top10_recent)

date_str = datetime.now().strftime('%b %d, %Y')

js_content = f'''window.trendingPapers = {json.dumps(top10_today)};
window.recentPapers = {json.dumps(top10_recent)};
window.papersLastUpdated = "{date_str}";'''

with open('papers_data.js', 'w') as f:
    f.write(js_content)

print(f'Successfully created papers_data.js with {len(top10_today)} today papers and {len(top10_recent)} recent papers.')
EOF

# Cleanup
rm papers_today.json papers_yesterday.json papers_daybefore.json

echo "Done! Refresh papers.html to see the updates."
