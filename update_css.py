import os
import re

css_path = "css/style.css"

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# 1. Change Font to Outfit
css = css.replace("family=Inter:wght@300;400;500;600;700;800", "family=Outfit:wght@300;400;500;600;700;800")
css = css.replace("font-family: 'Inter', sans-serif;", "font-family: 'Outfit', sans-serif;")

# 2. Update variables for premium palette and shadows
new_vars = """
    /* Brand Colors */
    --primary-color: #FF5A1F; /* Premium Vivid Orange */
    --primary-hover: #E34A12;
    --primary-light: #FFF0EB;

    --dark-navy: #0B1120; /* Sleeker, deeper space navy */
    --dark-navy-hover: #151F33;

    /* UI Colors */
    --bg-color: #F8FAFC;
    --bg-color-alt: #F1F5F9;
    --white: #FFFFFF;
    --text-dark: #1E293B;
    --text-light: #64748B;
    --text-muted: #94A3B8;
    --border-color: #E2E8F0;

    /* Status Colors */
    --success: #10B981;
    --danger: #EF4444;
    --warning: #F59E0B;

    /* Shadows - softer and premium */
    --shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.02);
    --shadow-md: 0 10px 30px -10px rgba(0, 0, 0, 0.08); /* Apple-style */
    --shadow-lg: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
    --shadow-glow: 0 8px 25px -5px rgba(255, 90, 31, 0.4);

    /* Border Radius */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --radius-full: 9999px;

    /* Transitions */
    --transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
"""

# Replace the :root block
css = re.sub(r':root\s*\{.*?\}\s*\/\* Base Reset \*\/', ':root {' + new_vars + '}\n\n/* Base Reset */', css, flags=re.DOTALL)

# 3. Add Glassmorphism to Navbar
navbar_glass = """
.navbar {
    background-color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    position: sticky;
    top: 0;
    z-index: 1000;
}
"""
css = re.sub(r'\.navbar\s*\{[^}]+\}', navbar_glass.strip(), css)

# 4. Enhance buttons
btn_primary = """
.btn-primary {
    background: linear-gradient(135deg, var(--primary-color), #FF7A45);
    color: var(--white);
    box-shadow: var(--shadow-glow);
    border: none;
}
.btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 30px -5px rgba(255, 90, 31, 0.5);
    background: linear-gradient(135deg, var(--primary-hover), var(--primary-color));
}
"""
css = re.sub(r'\.btn-primary\s*\{[^}]+\}', "", css) # remove old
css = re.sub(r'\.btn-primary:hover\s*\{[^}]+\}', "", css)
css = css.replace(".btn {", btn_primary + "\n.btn {")

# 5. Product Card Hover effects
card_hover = """
.card {
    background-color: var(--white);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: var(--transition);
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.03);
}
.card:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-lg);
    border-color: transparent;
}
"""
css = re.sub(r'\.card\s*\{[^}]+\}', "", css)
css = re.sub(r'\.card:hover\s*\{[^}]+\}', "", css)
css += "\n" + card_hover

# 6. Smooth scrolling & Body bg
css += "\n\nhtml { scroll-behavior: smooth; }\n"
css = css.replace("background-color: var(--bg-color);", "background-color: var(--bg-color); background-image: radial-gradient(var(--bg-color-alt) 1px, transparent 1px); background-size: 20px 20px;")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("CSS refined successfully.")
