import json
import re
import os

def process_text(text):
    # Split text separating out {tags}
    tokens = re.split(r'(\{.*?\})', text)
    
    for i in range(0, len(tokens), 2):
        chunk = tokens[i]
        
        # Exclamations/Questions not followed by existing pause or lineend
        chunk = re.sub(r'([!?])(?!\{p:|\{nl\}|\}|"|”|»|”|\)|\s*$)', r'\1{p:200}', chunk)
        
        # Ellipsis ...
        chunk = re.sub(r'(\.\.\.)(?!\{p:|\{nl\}|\}|"|”|»|”|\)|\s*$)', r'\1{p:200}', chunk)
        
        # Commas , 
        chunk = re.sub(r'(,)(?!\{p:|\{nl\}|\}|"|”|»|”|\)|\s*$)', r'\1{p:150}', chunk)
        
        # Semicolons / Colons
        chunk = re.sub(r'([;:])(?!\{p:|\{nl\}|\}|"|”|»|”|\)|\s*$)', r'\1{p:150}', chunk)
        
        # Em-dash --
        chunk = re.sub(r'(--)(?!\{p:|\{nl\}|\}|"|”|»|”|\)|\s*$)', r'\1{p:150}', chunk)
        
        tokens[i] = chunk
        
    return "".join(tokens)

def process_node(node):
    changed = False
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "text" and isinstance(v, str):
                new_v = process_text(v)
                if new_v != v:
                    node[k] = new_v
                    changed = True
            else:
                if process_node(v):
                    changed = True
    elif isinstance(node, list):
        for i in range(len(node)):
            if process_node(node[i]):
                changed = True
    return changed

def main():
    base_dir = "assets/scenes/FlyHigh"
    for lang in ["EN", "ES"]:
        lang_dir = os.path.join(base_dir, lang)
        for root, dirs, files in os.walk(lang_dir):
            for filename in files:
                if filename.endswith(".json") and filename != "localized_shared_assets.json":
                    filepath = os.path.join(root, filename)
                    with open(filepath, 'r', encoding='utf-8-sig') as f:
                        data = json.load(f)
                    if process_node(data):
                        with open(filepath, 'w', encoding='utf-8-sig') as f:
                            json.dump(data, f, indent=4, ensure_ascii=False)
                        print(f"Updated: {filepath}")

if __name__ == "__main__":
    main()
