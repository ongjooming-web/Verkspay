from PIL import Image

# Load the image
img = Image.open(r"C:\Users\Kevin Ong\.openclaw\media\inbound\file_349---035414ca-409b-47c6-a010-853f9f2b00ce.jpg")

# Convert to RGBA
img = img.convert("RGBA")

# Get pixel data
pixels = img.load()
width, height = img.size

# Remove white/light gray background
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # If pixel is very light (white or light gray), make transparent
        if r > 200 and g > 200 and b > 200:
            pixels[x, y] = (255, 255, 255, 0)

# Save
img.save(r"C:\Users\Kevin Ong\.openclaw\workspace\prism\public\logo.png", "PNG")
print("Done! Background removed.")
