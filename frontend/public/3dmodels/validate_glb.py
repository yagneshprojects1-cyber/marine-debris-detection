#!/usr/bin/env python3
"""
Validate GLB files and check their structure.
"""

import struct
import os
import json

def validate_glb_file(filepath):
    """Validate a GLB file and print its structure."""
    print(f"\n📋 Validating {os.path.basename(filepath)}...")
    
    try:
        with open(filepath, 'rb') as f:
            # Read GLB header
            magic = f.read(4)
            if magic != b'glTF':
                print(f"  ❌ Invalid magic number: {magic}")
                return False
            
            version = struct.unpack('<I', f.read(4))[0]
            length = struct.unpack('<I', f.read(4))[0]
            
            print(f"  ✓ Magic: {magic.decode()}")
            print(f"  ✓ Version: {version}")
            print(f"  ✓ File size: {length} bytes")
            
            # Read JSON chunk
            chunk_length = struct.unpack('<I', f.read(4))[0]
            chunk_type = f.read(4)
            
            if chunk_type != b'JSON':
                print(f"  ⚠️  First chunk is {chunk_type}, expected JSON")
            
            json_data = f.read(chunk_length)
            try:
                glb_json = json.loads(json_data)
                print(f"  ✓ JSON valid")
                
                # Check for scene
                if 'scenes' in glb_json:
                    print(f"  ✓ Scenes found: {len(glb_json['scenes'])}")
                else:
                    print(f"  ❌ No scenes in GLB file!")
                    
                if 'nodes' in glb_json:
                    print(f"  ✓ Nodes found: {len(glb_json['nodes'])}")
                else:
                    print(f"  ⚠️  No nodes in GLB file")
                    
                if 'meshes' in glb_json:
                    print(f"  ✓ Meshes found: {len(glb_json['meshes'])}")
                else:
                    print(f"  ⚠️  No meshes in GLB file")
                
                return True
            except json.JSONDecodeError as e:
                print(f"  ❌ Invalid JSON: {e}")
                return False
                
    except Exception as e:
        print(f"  ❌ Error reading file: {e}")
        return False

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    models = [
        'human_body.glb',
        'ghost_net.glb',
        'ship_wreck.glb',
        'plane_wreck.glb',
    ]
    
    print("=" * 50)
    print("GLB File Validation")
    print("=" * 50)
    
    all_valid = True
    for model in models:
        filepath = os.path.join(script_dir, model)
        if os.path.exists(filepath):
            if not validate_glb_file(filepath):
                all_valid = False
        else:
            print(f"\n❌ {model} not found!")
            all_valid = False
    
    print("\n" + "=" * 50)
    if all_valid:
        print("✓ All models are valid!")
    else:
        print("❌ Some models have issues")
    print("=" * 50)
