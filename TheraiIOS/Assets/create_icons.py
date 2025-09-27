#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the iOS app
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL not available, creating simple text files instead")

def create_google_icon():
    if PIL_AVAILABLE:
        # Create Google icon (colored G)
        img = Image.new('RGBA', (24, 24), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        # Draw a simple G shape
        draw.ellipse([2, 2, 22, 22], fill=(66, 133, 244, 255))  # Google blue
        draw.ellipse([4, 4, 20, 20], fill=(255, 255, 255, 255))  # White center
        draw.rectangle([12, 4, 20, 20], fill=(66, 133, 244, 255))  # Blue bar
        draw.rectangle([12, 4, 20, 12], fill=(255, 255, 255, 255))  # White cutout
        img.save('google-icon.png')
        print("Google icon created with PIL")
    else:
        # Create a simple text file as placeholder
        with open('google-icon.txt', 'w') as f:
            f.write("Google Icon Placeholder\n")
            f.write("Replace with actual Google icon\n")
            f.write("Size: 24x24px\n")
        print("Google icon placeholder created")

def create_apple_icon():
    if PIL_AVAILABLE:
        # Create Apple icon (simple apple shape)
        img = Image.new('RGBA', (24, 24), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        # Draw a simple apple shape
        draw.ellipse([6, 4, 18, 16], fill=(0, 0, 0, 255))  # Black apple body
        draw.ellipse([8, 2, 10, 4], fill=(0, 0, 0, 255))  # Apple stem
        img.save('apple-icon.png')
        print("Apple icon created with PIL")
    else:
        # Create a simple text file as placeholder
        with open('apple-icon.txt', 'w') as f:
            f.write("Apple Icon Placeholder\n")
            f.write("Replace with actual Apple icon\n")
            f.write("Size: 24x24px\n")
        print("Apple icon placeholder created")

if __name__ == "__main__":
    create_google_icon()
    create_apple_icon()
    print("Icons created successfully!")

