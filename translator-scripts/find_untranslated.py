import os
import json
from collections import OrderedDict

def load_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f, object_pairs_hook=OrderedDict)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def find_untranslated_keys(en_dict, lang_dict, prefix=""):
    """
    Recursively find keys where the value matches the English value.
    Returns a list of key paths (dot notation).
    """
    untranslated = []
    for key, en_val in en_dict.items():
        path = f"{prefix}.{key}" if prefix else key
        lang_val = lang_dict.get(key)
        if isinstance(en_val, dict) and isinstance(lang_val, dict):
            untranslated.extend(find_untranslated_keys(en_val, lang_val, path))
        elif isinstance(en_val, list) and isinstance(lang_val, list):
            # Compare lists element-wise
            for i, (en_item, lang_item) in enumerate(zip(en_val, lang_val)):
                item_path = f"{path}[{i}]"
                if isinstance(en_item, dict) and isinstance(lang_item, dict):
                    untranslated.extend(find_untranslated_keys(en_item, lang_item, item_path))
                elif en_item == lang_item:
                    untranslated.append(item_path)
        else:
            if lang_val == en_val:
                untranslated.append(path)
    return untranslated

def main():
    LANG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js', 'i18n', 'languages')
    en_path = os.path.join(LANG_DIR, 'en.json')
    en_data = load_json_file(en_path)
    if en_data is None:
        print("Could not load en.json")
        return
    for fname in os.listdir(LANG_DIR):
        if fname.endswith('.json') and fname != 'en.json':
            lang_code = fname[:-5]
            lang_path = os.path.join(LANG_DIR, fname)
            lang_data = load_json_file(lang_path)
            if lang_data is None:
                print(f"Skipping {fname}: could not load.")
                continue
            untranslated = find_untranslated_keys(en_data, lang_data)
            if untranslated:
                print(f"\nUntranslated keys in {lang_code}:")
                for key in untranslated:
                    print("  ", key)
            else:
                print(f"\nAll keys translated in {lang_code}!")

if __name__ == "__main__":
    main()
