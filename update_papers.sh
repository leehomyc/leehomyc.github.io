#!/bin/bash
# Fetch papers for the last 30 days
echo "Fetching papers for the last 30 days..."

# Create a temporary directory for json files
mkdir -p temp_papers

# Generate dates and fetch in parallel
for i in {0..29}; do
    (
        date_val=$(date -v-${i}d +%Y-%m-%d)
        if [ ! -f "temp_papers/papers_$date_val.json" ] || [ "$date_val" == "$(date +%Y-%m-%d)" ]; then
            echo "Fetching $date_val..."
            curl -s "https://huggingface.co/api/daily_papers?date=$date_val" > "temp_papers/papers_$date_val.json"
        fi
    ) &
    
    # Limit to 10 concurrent jobs
    if [[ $(jobs -r -p | wc -l) -ge 10 ]]; then
        wait -n
    fi
done
wait

echo "Processing data..."
python3 <<EOF
import json
import requests
import os
import time
import glob
from datetime import datetime, timedelta

API_KEY = os.environ.get("OPENAI_API_KEY")

if not API_KEY:
    print("Error: OPENAI_API_KEY environment variable not set.")
    print("Please export your API key: export OPENAI_API_KEY='your-key-here'")
    exit(1)

CACHE_FILE = 'papers_cache.json'
DELAY_SECONDS = 5

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_cache(cache):
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)

cache = load_cache()

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

def process_papers(papers):
    processed = []
    for p in papers:
        try:
            pid = p['paper']['id']
            summary = p['paper']['summary']
            
            if pid not in cache:
                cache[pid] = {}
            
            # Translate to Chinese
            if 'summary_zh' in cache[pid] and cache[pid]['summary_zh'] and cache[pid]['summary_zh'] != "Translation unavailable":
                p['paper']['summary_zh'] = cache[pid]['summary_zh']
            elif 'summary_zh' not in p['paper'] or not p['paper']['summary_zh']:
                print(f"Translating {pid}...")
                time.sleep(DELAY_SECONDS)
                zh = call_openai(summary, "translate")
                if zh:
                    p['paper']['summary_zh'] = zh
                    cache[pid]['summary_zh'] = zh
                    save_cache(cache)
                else:
                    p['paper']['summary_zh'] = "Translation unavailable"
            
            # Generate Summary
            if 'summary_simple' in cache[pid] and cache[pid]['summary_simple'] and cache[pid]['summary_simple'] != "Summary unavailable":
                p['paper']['summary_simple'] = cache[pid]['summary_simple']
            elif 'summary_simple' not in p['paper'] or not p['paper']['summary_simple']:
                print(f"Summarizing {pid}...")
                time.sleep(DELAY_SECONDS)
                simple = call_openai(summary, "summary")
                if simple:
                    p['paper']['summary_simple'] = simple
                    cache[pid]['summary_simple'] = simple
                    save_cache(cache)
                else:
                    p['paper']['summary_simple'] = "Summary unavailable"
            
            processed.append(p)
                
        except Exception as e:
            print(f"Processing failed for {p['paper']['id']}: {e}")
            processed.append(p)
    return processed

# Load all papers
all_papers = []
for filename in glob.glob('temp_papers/papers_*.json'):
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
            all_papers.extend(data)
    except:
        pass

# Deduplicate by ID
seen_ids = set()
unique_papers = []
for p in all_papers:
    pid = p['paper']['id']
    if pid not in seen_ids:
        seen_ids.add(pid)
        unique_papers.append(p)

# Helper to filter by date
def filter_papers(papers, days):
    cutoff = datetime.now() - timedelta(days=days)
    filtered = []
    for p in papers:
        try:
            pub_date_str = p['paper']['publishedAt']
            pub_date = datetime.fromisoformat(pub_date_str.replace('Z', '+00:00')).replace(tzinfo=None)
            if pub_date >= cutoff:
                filtered.append(p)
        except:
            pass
    return filtered

# 1. Identify Top 10 for each category FIRST (No API calls yet)
today_str = datetime.now().strftime('%Y-%m-%d')
today_file = f'temp_papers/papers_{today_str}.json'
papers_today_raw = []

# Try to load today's file
if os.path.exists(today_file):
    try:
        with open(today_file, 'r') as f:
            papers_today_raw = json.load(f)
    except:
        papers_today_raw = []

# If today is empty (maybe early morning), try yesterday
if not papers_today_raw:
    yesterday_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    yesterday_file = f'temp_papers/papers_{yesterday_str}.json'
    if os.path.exists(yesterday_file):
        try:
            with open(yesterday_file, 'r') as f:
                papers_today_raw = json.load(f)
        except:
            pass

papers_today_raw.sort(key=lambda x: x['paper']['upvotes'], reverse=True)
top10_today_raw = papers_today_raw[:10]

papers_week_raw = filter_papers(unique_papers, 7)
papers_week_raw.sort(key=lambda x: x['paper']['upvotes'], reverse=True)
top10_week_raw = papers_week_raw[:10]

papers_month_raw = filter_papers(unique_papers, 30)
papers_month_raw.sort(key=lambda x: x['paper']['upvotes'], reverse=True)
top10_month_raw = papers_month_raw[:10]

# 2. Process ONLY these selected papers
print(f"Processing {len(top10_today_raw)} Today, {len(top10_week_raw)} Week, {len(top10_month_raw)} Month papers...")

top10_today = process_papers(top10_today_raw)
top10_week = process_papers(top10_week_raw)
top10_month = process_papers(top10_month_raw)

date_str = datetime.now().strftime('%b %d, %Y')

js_content = f'''window.trendingPapers = {{
    "today": {json.dumps(top10_today)},
    "week": {json.dumps(top10_week)},
    "month": {json.dumps(top10_month)}
}};
window.papersLastUpdated = "{date_str}";'''

with open('papers_data.js', 'w') as f:
    f.write(js_content)

print(f'Successfully created papers_data.js')
EOF

echo "Done! Refresh papers.html to see the updates."

