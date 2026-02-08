import os
import re

def rename_files_and_folders(root_dir):
    print(f"📂 Scanning directory: {root_dir}...\n")
    
    # topdown=False is CRITICAL. 
    # It ensures we rename files INSIDE folders before renaming the folders themselves.
    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
        
        # --- 1. Rename Files (q5.png -> Q5.png) ---
        for filename in filenames:
            # Regex: matches starting with 'q', followed by digits, capturing the rest (extension)
            # Case insensitive re.IGNORECASE handles 'q' or 'Q'
            match = re.match(r"^q(\d+)(.*)$", filename, re.IGNORECASE)
            
            if match:
                num = match.group(1)
                rest = match.group(2) # Extension or suffix (e.g. .png or -1.jpg)
                
                # Check if it starts with lowercase 'q' to avoid re-renaming
                if filename.startswith("q"):
                    new_name = f"Q{num}{rest}"
                    old_path = os.path.join(dirpath, filename)
                    new_path = os.path.join(dirpath, new_name)
                    
                    try:
                        os.rename(old_path, new_path)
                        print(f"📄 Renamed File: {filename} -> {new_name}")
                    except Exception as e:
                        print(f"❌ Error renaming {filename}: {e}")

        # --- 2. Rename Folders (step2 -> S2) ---
        for dirname in dirnames:
            # Regex: matches 'step' followed by digits
            match = re.match(r"^step(\d+)$", dirname, re.IGNORECASE)
            
            if match:
                num = match.group(1)
                new_name = f"S{num}"
                
                old_path = os.path.join(dirpath, dirname)
                new_path = os.path.join(dirpath, new_name)
                
                try:
                    os.rename(old_path, new_path)
                    print(f"📁 Renamed Folder: {dirname} -> {new_name}")
                except Exception as e:
                    print(f"❌ Error renaming {dirname}: {e}")

    print("\n✅ Renaming complete.")

if __name__ == "__main__":
    # Change this path if your images are somewhere else
    target_folder = "./images" 
    
    if os.path.exists(target_folder):
        rename_files_and_folders(target_folder)
    else:
        print(f"❌ Could not find folder: {target_folder}")