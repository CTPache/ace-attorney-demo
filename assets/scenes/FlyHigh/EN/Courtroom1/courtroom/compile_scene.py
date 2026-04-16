import json
import os
import re
import glob

# Configuration paths
INPUT_DIR = r'.'
OUTPUT_FILE = r'..\Courtroom1\compiled_courtroom.json'

def compile_scene():
    compiled_data = {}

    print(f"Reading from: {INPUT_DIR}")
    
    # 1. Read base configuration files (everything except strings files)
    base_files = [f for f in glob.glob(os.path.join(INPUT_DIR, '*.json')) if 'strings' not in os.path.basename(f)]
    for file_path in base_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Manifest contains top-level keys directly (like initialSection)
            if os.path.basename(file_path) == 'manifest.json':
                compiled_data.update(data)
            else:
                compiled_data.update(data)
                
    # 2. Find all strings files and compile a version for each
    string_files = glob.glob(os.path.join(INPUT_DIR, 'strings*.json'))
    if not string_files:
        string_files = [os.path.join(INPUT_DIR, 'strings.json')] # fallback if none exist

    for strings_path in string_files:
        strings_dict = {}
        if os.path.exists(strings_path):
            with open(strings_path, 'r', encoding='utf-8') as f:
                strings_dict = json.load(f)
                
        # Determine output filename (e.g. strings_en.json -> compiled_courtroom_en.json)
        basename = os.path.basename(strings_path)
        if basename == 'strings.json':
            output_file = OUTPUT_FILE
        else:
            suffix = basename.replace('strings_', '').replace('.json', '')
            output_file = OUTPUT_FILE.replace('.json', f'_{suffix}.json')
                
        # Helper to replace localized text
        i18n_pattern = re.compile(r'\{\{i18n:(.*?)\}\}')
        def process_item(item_dict, keys):
            for key in keys:
                if key in item_dict and isinstance(item_dict[key], str):
                    def replace_i18n(match):
                        return strings_dict.get(match.group(1), match.group(0))
                    item_dict[key] = i18n_pattern.sub(replace_i18n, item_dict[key])

        # Deep copy compiled_data to avoid mutating the base dicts on multiple iterations
        import copy
        current_compiled = copy.deepcopy(compiled_data)

        # 3. Read and compile gameScript
        gamescript_dir = os.path.join(INPUT_DIR, 'gameScript')
        current_compiled['gameScript'] = {}

        if os.path.exists(gamescript_dir):
            for script_file in glob.glob(os.path.join(gamescript_dir, '*.json')):
                section_name = os.path.splitext(os.path.basename(script_file))[0]
                with open(script_file, 'r', encoding='utf-8') as f:
                    lines = json.load(f)
                    
                    # Replace i18n placeholders with actual string content
                    for line in lines:
                        process_item(line, ['text', 'name'])
                    
                    current_compiled['gameScript'][section_name] = lines
                    
        # 4. Handle localized fields inside options & crossExaminations
        opts = current_compiled.get('options', {})
        for opt_key, opt_data in opts.items():
            process_item(opt_data, ['text', 'name'])
            for choice in opt_data.get('options', []):
                process_item(choice, ['text'])

        ces = current_compiled.get('crossExaminations', {})
        for ce_key, ce_data in ces.items():
            process_item(ce_data, ['witnessName'])
            for stmt_key, stmt in ce_data.get('statements', {}).items():
                process_item(stmt, ['text'])

        # 5. Write compiled data to the output file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(current_compiled, f, ensure_ascii=False, indent=4)

        print(f"Successfully compiled back to: {output_file} from {basename}")

if __name__ == '__main__':
    compile_scene()
