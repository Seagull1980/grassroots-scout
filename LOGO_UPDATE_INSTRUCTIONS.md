# Logo Update Instructions

## How to Replace "Hub" with "Scout" in Your Logo

### Quick Steps:
1. **Locate the logo file**: Navigate to `C:\Users\cgill\Desktop\Thegrassrootshub\The Grassroots Hub - V4\public\logo.jpg`

2. **Make a backup**: Copy `logo.jpg` and save it as `logo-original.jpg` (just in case)

3. **Edit the image**:
   - **Option A - MS Paint (Simple)**:
     - Right-click on `logo.jpg` → "Edit with Paint"  
     - Use the text tool to cover "Hub" with a rectangle/brush in the background color
     - Add "Scout" text in the same position using the same font style and color
     - Save the file
     
   - **Option B - GIMP (Free, more advanced)**:
     - Download GIMP if you don't have it: https://www.gimp.org/
     - Open logo.jpg in GIMP
     - Use the Clone tool or Healing tool to remove "Hub"
     - Add "Scout" text using the Text tool, matching the original font and color
     - Export as JPG
     
   - **Option C - Photoshop (If available)**:
     - Open logo.jpg in Photoshop
     - Use Content-Aware Fill to remove "Hub"
     - Add "Scout" text layer with matching font and styling
     - Save as JPG

4. **Verify the change**: Refresh your browser at http://localhost:5173 to see the updated logo

### Font Matching Tips:
- Look for common fonts like Arial, Helvetica, Roboto, or similar sans-serif fonts
- Match the font weight (bold, regular, etc.)
- Match the color exactly using the color picker tool
- Ensure the text size and positioning match the original

### Alternative: Online Image Editors
- **Canva**: Upload your logo and edit the text
- **Photopea**: Free online Photoshop alternative
- **Paint.NET**: Free Windows image editor

### If you need help:
- Take a screenshot of your original logo and I can help identify the font and colors
- Let me know if you'd like me to implement the CSS overlay solution as a temporary fix

The logo file will automatically update across your entire application once you save the new version.