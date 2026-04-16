import json
import os
import re

# Configuration paths
INPUT_FILE = r'c:\xampp\htdocs\Demo\assets\scenes\FlyHigh\EN\Courtroom1\courtroom.json'
OUTPUT_DIR = r'c:\xampp\htdocs\Demo\assets\scenes\FlyHigh\EN\Courtroom1\courtroom'

def separate_scene():
    print(f"Reading from: {INPUT_FILE}")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, 'gameScript'), exist_ok=True)

    strings = {}
    cmd_pattern_start = re.compile(r'^(\{[^{}]+\})+')
    cmd_pattern_end = re.compile(r'(\{[^{}]+\})+$')

    def process_text(original_text, str_key):
        if '{{i18n:' in original_text:
            return original_text
            
        m_start = cmd_pattern_start.search(original_text)
        start_cmds = m_start.group(0) if m_start else ''
        
        remaining_text = original_text[len(start_cmds):]
        m_end = cmd_pattern_end.search(remaining_text)
        end_cmds = m_end.group(0) if m_end else ''
        
        core_text = remaining_text[:len(remaining_text)-len(end_cmds)] if end_cmds else remaining_text
        
        if core_text.strip() != '':
            strings[str_key] = core_text
            return f'{start_cmds}{{{{i18n:{str_key}}}}}{end_cmds}'
        return original_text

    # 1. Handle gameScript and extract strings
    gs = data.get('gameScript', {})
    for section_name, lines in gs.items():
        for i, line in enumerate(lines):
            if 'text' in line:
                line['text'] = process_text(line['text'], f'{section_name}_{i}')
            if 'name' in line and line['name']:
                name_val = line['name']
                if '{{i18n:' not in name_val:
                    name_key = f'Name_{name_val}'
                    strings[name_key] = name_val
                    line['name'] = f'{{{{i18n:{name_key}}}}}'
        with open(os.path.join(OUTPUT_DIR, 'gameScript', f'{section_name}.json'), 'w', encoding='utf-8') as sf:
            json.dump(lines, sf, ensure_ascii=False, indent=4)

    # 2. Handle options and crossExaminations strings before standard sections
    opts = data.get('options', {})
    for opt_key, opt_data in opts.items():
        if 'text' in opt_data:
            opt_data['text'] = process_text(opt_data['text'], f'Option_{opt_key}_text')
        if 'name' in opt_data and opt_data['name']:
            name_val = opt_data['name']
            if '{{i18n:' not in name_val:
                name_key = f'Name_{name_val}'
                strings[name_key] = name_val
                opt_data['name'] = f'{{{{i18n:{name_key}}}}}'
        for i, choice in enumerate(opt_data.get('options', [])):
            if 'text' in choice:
                choice['text'] = process_text(choice['text'], f'Option_{opt_key}_opt_{i}')

    ces = data.get('crossExaminations', {})
    for ce_key, ce_data in ces.items():
        if 'witnessName' in ce_data and ce_data['witnessName']:
            wname_val = ce_data['witnessName']
            if '{{i18n:' not in wname_val:
                name_key = f'Name_{wname_val}'
                strings[name_key] = wname_val
                ce_data['witnessName'] = f'{{{{i18n:{name_key}}}}}'
        for stmt_key, stmt in ce_data.get('statements', {}).items():
            if 'text' in stmt:
                stmt['text'] = process_text(stmt['text'], f'CE_{ce_key}_stmt_{stmt_key}')

    # 3. Dump standard sections & manifest
    for k in data.keys():
        if k not in ('gameScript', 'initialSection'):
            with open(os.path.join(OUTPUT_DIR, f'{k}.json'), 'w', encoding='utf-8') as cf:
                json.dump({k: data[k]}, cf, ensure_ascii=False, indent=4)

    if 'initialSection' in data:
        with open(os.path.join(OUTPUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as mf:
            json.dump({'initialSection': data['initialSection']}, mf, ensure_ascii=False, indent=4)

    # 4. Write/Update strings.json
    # If strings.json exists, we update it rather than overwrite completely, to preserve existing keys/values
    strings_path = os.path.join(OUTPUT_DIR, 'strings.json')
    if os.path.exists(strings_path):
        with open(strings_path, 'r', encoding='utf-8') as stf_read:
            try:
                existing_strings = json.load(stf_read)
                existing_strings.update(strings)
                strings = existing_strings
            except json.JSONDecodeError:
                pass
                
    with open(strings_path, 'w', encoding='utf-8') as stf:
        json.dump(strings, stf, ensure_ascii=False, indent=4)

    print(f"Successfully separated into: {OUTPUT_DIR}")

if __name__ == '__main__':
    separate_scene()
