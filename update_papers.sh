#!/bin/bash
echo "Fetching latest trending papers from Hugging Face..."
curl -s https://huggingface.co/api/daily_papers > papers.json

echo "Converting to JavaScript data file..."
python3 -c "import json; 
from datetime import datetime;
try:
    with open('papers.json', 'r') as f: data = json.load(f); 
    top3 = data[:3]; 
    date_str = datetime.now().strftime('%b %d, %Y');
    js_content = f'window.trendingPapers = {json.dumps(top3)};\nwindow.papersLastUpdated = \"{date_str}\";';
    with open('papers_data.js', 'w') as f: f.write(js_content);
    print('Successfully created papers_data.js with top 3 papers and date.');
except Exception as e:
    print(f'Error processing JSON: {e}');
"

echo "Done! Refresh papers.html to see the updates."
