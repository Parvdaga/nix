import os
from PIL import Image

def generate_icons():
    logo_path = r"c:\Users\parvd\OneDrive\Desktop\work\Splittracker\public\nix_logo.png"
    public_dir = r"c:\Users\parvd\OneDrive\Desktop\work\Splittracker\public"
    app_dir = r"c:\Users\parvd\OneDrive\Desktop\work\Splittracker\src\app"

    if not os.path.exists(logo_path):
        print(f"Error: Nix logo not found at {logo_path}")
        return

    print(f"Opening original logo: {logo_path}")
    img = Image.open(logo_path)

    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Define targets: (width, height), output_path
    targets = [
        ((192, 192), os.path.join(public_dir, "icon-192.png")),
        ((512, 512), os.path.join(public_dir, "icon-512.png")),
        ((180, 180), os.path.join(public_dir, "apple-touch-icon.png")),
    ]

    for size, path in targets:
        print(f"Generating {size[0]}x{size[1]} -> {path}")
        # Use high-quality resampling (LANCZOS/Resampling.LANCZOS depending on pillow version)
        try:
            resample_filter = Image.Resampling.LANCZOS
        except AttributeError:
            resample_filter = Image.LANCZOS
            
        resized_img = img.resize(size, resample_filter)
        resized_img.save(path, format="PNG")

    # Generate favicons
    # 1. favicon.ico (Next.js app/favicon.ico)
    favicon_path = os.path.join(app_dir, "favicon.ico")
    print(f"Generating favicon.ico -> {favicon_path}")
    
    # We can save as ICO with multiple sizes
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    favicon_imgs = []
    
    try:
        resample_filter = Image.Resampling.LANCZOS
    except AttributeError:
        resample_filter = Image.LANCZOS

    for size in favicon_sizes:
        favicon_imgs.append(img.resize(size, resample_filter))
        
    favicon_imgs[0].save(
        favicon_path,
        format="ICO",
        sizes=[(im.width, im.height) for im in favicon_imgs],
        append_images=favicon_imgs[1:]
    )
    
    # Also save to public/favicon.ico just in case
    public_favicon_path = os.path.join(public_dir, "favicon.ico")
    print(f"Generating public favicon.ico -> {public_favicon_path}")
    favicon_imgs[0].save(
        public_favicon_path,
        format="ICO",
        sizes=[(im.width, im.height) for im in favicon_imgs],
        append_images=favicon_imgs[1:]
    )

    print("Icon generation completed successfully!")

if __name__ == "__main__":
    generate_icons()
