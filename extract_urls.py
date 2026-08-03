import json
import os
import re

def is_official(url, text, name, address):
    url = url.lower()
    text = text.lower()
    name = name.lower()
    
    # Exclude list
    excluded = ['findagrave.com', 'yelp.com', 'facebook.com', 'wikipedia.org', 'cemetery.com', 'interment.net', 'billiongraves.com', 'tripadvisor.com', 'yellowpages.com', 'mapquest.com']
    for ex in excluded:
        if ex in url:
            return False
            
    # Positive patterns
    if 'dignitymemorial.com' in url:
        return True
    if 'va.gov' in url and 'cem' in url:
        return True
    if '.gov' in url:
        return True
    if 'restlandfuneralhome.com' in url:
        return True
    if 'greenwoodfuneralhomes.com' in url:
        return True
    if 'tjmfuneral.com' in url: # Turrentine-Jackson-Morrow (Ridgeview)
        return True
    if 'resthavenfuneral.com' in url:
        return True
    if 'teddickeywestfuneral.com' in url:
        return True
    if 'lucasfuneralhomes.com' in url:
        return True
    if 'scottsdalememorialpark.com' in url: # Just an example
        pass

    # Site specific for the names
    if 'oaklandcemeterydallas.com' in url: return True
    if 'greenwoodcemeterydallas.com' in url: return True
    if 'tedemanuel.org' in url: return True
    if 'mountolivetmemorialpark.com' in url: return True

    # Generic check: if the URL contains the name or parts of it and looks like a dedicated site
    # But usually Dignity or a specific funeral home covers these.
    
    return False

results = []
for i in range(36):
    file_path = f"result_{i}.json"
    best_url = None
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            data = json.load(f)
            for res in data.get('results', []):
                url = res.get('url', '')
                text = res.get('text', '')
                # We need to be careful with the mapping
                if is_official(url, text, "", ""):
                    best_url = url
                    break
    results.append({"n": i + 1, "url": best_url})

print(json.dumps(results, indent=2))
