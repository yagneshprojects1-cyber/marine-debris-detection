#!/usr/bin/env python3
"""
Generate sample 3D models in GLB format for testing the debris detector.
Requires: pip install trimesh numpy

Usage:
    python generate_models.py
    
This will create sample GLB models in the same directory as this script.
"""

import os
import sys

def generate_models():
    """Generate sample 3D models using trimesh."""
    try:
        import trimesh
        import numpy as np
    except ImportError:
        print("Error: trimesh and numpy are required.")
        print("Install them with: pip install trimesh numpy")
        return False
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Model definitions: (name, generator_function)
    models_to_create = [
        ('human_body.glb', create_human_body),
        ('ghost_net.glb', create_ghost_net),
        ('ship_wreck.glb', create_ship_wreck),
        ('plane_wreck.glb', create_plane_wreck),
    ]
    
    for filename, generator_func in models_to_create:
        filepath = os.path.join(script_dir, filename)
        if os.path.exists(filepath):
            print(f"✓ {filename} already exists, skipping...")
            continue
        
        try:
            mesh = generator_func()
            mesh.export(filepath)
            print(f"✓ Created {filename}")
        except Exception as e:
            print(f"✗ Failed to create {filename}: {e}")
            return False
    
    print("\n✓ All sample models generated successfully!")
    print("You can now upload sonar images and see 3D models rendered on the map.")
    return True


def create_human_body():
    """Create a simple human body model."""
    import trimesh
    
    # Create a simple bipedal figure
    meshes = []
    
    # Head (sphere)
    head = trimesh.primitives.Sphere(radius=0.5)
    head.apply_translation([0, 3, 0])
    meshes.append(head)
    
    # Torso (cylinder)
    torso = trimesh.primitives.Cylinder(radius=0.3, height=1.5)
    torso.apply_translation([0, 1.5, 0])
    meshes.append(torso)
    
    # Left arm (cylinder)
    left_arm = trimesh.primitives.Cylinder(radius=0.15, height=1.2)
    left_arm.apply_translation([-0.6, 1.8, 0])
    meshes.append(left_arm)
    
    # Right arm (cylinder)
    right_arm = trimesh.primitives.Cylinder(radius=0.15, height=1.2)
    right_arm.apply_translation([0.6, 1.8, 0])
    meshes.append(right_arm)
    
    # Left leg (cylinder)
    left_leg = trimesh.primitives.Cylinder(radius=0.2, height=1.5)
    left_leg.apply_translation([-0.3, 0.2, 0])
    meshes.append(left_leg)
    
    # Right leg (cylinder)
    right_leg = trimesh.primitives.Cylinder(radius=0.2, height=1.5)
    right_leg.apply_translation([0.3, 0.2, 0])
    meshes.append(right_leg)
    
    combined = trimesh.util.concatenate(meshes)
    return combined


def create_ghost_net():
    """Create a simple tangled net model."""
    import trimesh
    import numpy as np
    
    # Create a wavy grid to represent a net
    vertices = []
    faces = []
    
    # Grid dimensions
    grid_size = 8
    scale = 1.5
    
    # Create grid with wave deformation
    for i in range(grid_size):
        for j in range(grid_size):
            x = (i - grid_size/2) * scale / grid_size
            y = np.sin(i * 0.5) * 0.5
            z = (j - grid_size/2) * scale / grid_size + np.cos(j * 0.5) * 0.3
            vertices.append([x, y, z])
    
    # Create faces (grid quads converted to triangles)
    for i in range(grid_size - 1):
        for j in range(grid_size - 1):
            v0 = i * grid_size + j
            v1 = v0 + 1
            v2 = v0 + grid_size
            v3 = v2 + 1
            
            faces.append([v0, v1, v2])
            faces.append([v1, v3, v2])
    
    mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    return mesh


def create_ship_wreck():
    """Create a simple ship wreck model."""
    import trimesh
    
    meshes = []
    
    # Hull (main box)
    hull = trimesh.primitives.Box(extents=[3, 1, 1])
    hull.apply_translation([0, 0, 0])
    meshes.append(hull)
    
    # Bow (front part - use box instead of cone)
    bow = trimesh.primitives.Box(extents=[0.8, 0.8, 0.8])
    bow.apply_translation([1.5, 0.5, 0])
    meshes.append(bow)
    
    # Broken mast (cylinder)
    mast = trimesh.primitives.Cylinder(radius=0.1, height=2.5)
    mast.apply_translation([-0.5, 1.5, 0])
    meshes.append(mast)
    
    # Cabin (box)
    cabin = trimesh.primitives.Box(extents=[0.8, 0.6, 0.8])
    cabin.apply_translation([-0.3, 0.8, 0])
    meshes.append(cabin)
    
    combined = trimesh.util.concatenate(meshes)
    return combined


def create_plane_wreck():
    """Create a simple plane wreck model."""
    import trimesh
    
    meshes = []
    
    # Fuselage (main body - cylinder)
    fuselage = trimesh.primitives.Cylinder(radius=0.4, height=3)
    fuselage.apply_translation([0, 0, 0])
    meshes.append(fuselage)
    
    # Wing (box - bent appearance)
    wing = trimesh.primitives.Box(extents=[3, 0.2, 0.5])
    wing.apply_translation([0, 0.5, 0])
    meshes.append(wing)
    
    # Tail (smaller cylinder)
    tail = trimesh.primitives.Cylinder(radius=0.15, height=1)
    tail.apply_translation([0, 0, 1.5])
    meshes.append(tail)
    
    # Cockpit (box - pyramid-like)
    cockpit = trimesh.primitives.Box(extents=[0.3, 0.3, 0.3])
    cockpit.apply_translation([0, 0.3, -1.3])
    meshes.append(cockpit)
    
    # Landing gear (cylinders)
    landing_gear_left = trimesh.primitives.Cylinder(radius=0.1, height=0.8)
    landing_gear_left.apply_translation([-0.8, -0.5, 0])
    meshes.append(landing_gear_left)
    
    landing_gear_right = trimesh.primitives.Cylinder(radius=0.1, height=0.8)
    landing_gear_right.apply_translation([0.8, -0.5, 0])
    meshes.append(landing_gear_right)
    
    combined = trimesh.util.concatenate(meshes)
    return combined


if __name__ == '__main__':
    success = generate_models()
    sys.exit(0 if success else 1)
