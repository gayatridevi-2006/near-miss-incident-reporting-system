import os
import math
from PIL import Image

src_path = r"c:\Users\Gayatri Devi\OneDrive\Desktop\Near miss incident\extracted_images\candidate_3.png"
dest_path = r"c:\Users\Gayatri Devi\OneDrive\Desktop\Near miss incident\frontend\src\pages\vizag_logo.png"

if not os.path.exists(src_path):
    print("Source image not found:", src_path)
    exit(1)

img = Image.open(src_path).convert("RGBA")
width, height = img.size
print(f"Loaded image size: {width}x{height}")

# Center of the 90x90 image is (45, 45)
# Wait, let's check if the size is exactly 90x90.
# candidate_3 was cropped with box (20, 12, 110, 102). 
# 110 - 20 = 90. 102 - 12 = 90. So yes, it is exactly 90x90.
cx, cy = 45, 45
radius = 43.5 # Outer circle radius

new_img = Image.new("RGBA", (width, height))

for y in range(height):
    for x in range(width):
        r, g, b, a = img.getpixel((x, y))
        dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        
        if dist > radius:
            # Make pixels outside the circle fully transparent
            new_img.putpixel((x, y), (0, 0, 0, 0))
        else:
            # Keep original pixel
            new_img.putpixel((x, y), (r, g, b, a))

# Save the transparent logo
os.makedirs(os.path.dirname(dest_path), exist_ok=True)
new_img.save(dest_path)
print(f"Saved transparent logo to {dest_path}")
