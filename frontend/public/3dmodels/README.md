# 3D Models for Debris Detector

This folder contains 3D models (in GLB/GLTF format) that represent different types of debris detected by the YOLO AI model.

## Model Files Expected

The following model files should be placed in this directory:

1. **human_body.glb** - 3D model of a human body for human detection
2. **ghost_net.glb** - 3D model of abandoned fishing nets
3. **ship_wreck.glb** - 3D model of a shipwreck
4. **plane_wreck.glb** - 3D model of a plane wreck

## How It Works

- When the YOLO detection API returns detected objects with names like "human body", "ghost net", "ship wreck", "plane wreck", the 3D visualization will automatically load and render the corresponding 3D model.
- If a model file is missing or fails to load, a colored fallback sphere will be rendered instead.
- The model loading is configured in `ModelLoader.jsx` in the MODEL_MAP variable.

## Adding New Models

To add support for new detection types:

1. **Create or obtain the 3D model** in GLB or GLTF format (Blender, 3D Studio Max, or any 3D modeling software supports these formats)
2. **Save it in this directory** with the appropriate name
3. **Update the MODEL_MAP** in `/src/components/ModelLoader.jsx` to include the new mapping:
   ```javascript
   const MODEL_MAP = {
     'your_object_type': '/3dmodels/your_model.glb',
     // ... existing models
   };
   ```

## Model Requirements

- **Format**: GLB (Binary glTF) or GLTF (ASCII glTF)
- **Size**: Keep models relatively small (<5MB) for better performance
- **Scale**: Models should be appropriately scaled (typically 1-10 units)
- **Materials**: Ensure materials are baked into the model or include necessary texture files

## Color Coding

When models are not available, colored fallback spheres are used:
- 🔴 Human Body: `#ff0088` (Hot Pink)
- 🔵 Ghost Net: `#0088ff` (Blue)
- 🟠 Ship Wreck: `#ff8800` (Orange)
- 🟢 Plane Wreck: `#88ff00` (Lime Green)

## Testing

Once you place model files in this directory:
1. Upload and detect debris using the app
2. Navigate to the 3D Map view
3. Click on detected objects to see their details
4. The 3D model will render automatically if the file exists

## Resources

- **Blender** (Free & Open Source): https://www.blender.org/
- **Sketchfab** (3D Model Library): https://sketchfab.com/ (search for "shipwreck", "ghost net", etc.)
- **glTF to GLB Converter**: Use Blender's export feature or online converters
- **Three.js GLTF Loader**: Automatically handles model loading and rendering
