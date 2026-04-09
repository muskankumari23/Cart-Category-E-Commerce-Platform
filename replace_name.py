import os

directory = r"c:\Users\s\OneDrive\Desktop\Cart - Multi Category E-Commerce Platform"

for root, _, files in os.walk(directory):
    if "node_modules" in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.json')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                new_content = content.replace("ShopNest", "Cart").replace("shopnest", "cart").replace("SHOPNEST", "CART")
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
            except Exception as e:
                pass
