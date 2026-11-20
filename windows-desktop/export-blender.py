import bpy
import sys
from pathlib import Path

output = sys.argv[sys.argv.index("--") + 1]
export = bpy.ops.export_scene.gltf
options = {}
if "export_hierarchy_full_collections" in export.get_rna_type().properties:
    options["export_hierarchy_full_collections"] = True
result = export(
    filepath=output,
    export_format="GLB",
    export_animations=False,
    use_visible=True,
    use_active_scene=True,
    **options,
)
if "FINISHED" not in result:
    raise RuntimeError("Blender could not export the model.")

units = bpy.context.scene.unit_settings
scale = units.scale_length if units.system != "NONE" else 1
Path(output).with_suffix(".scale").write_text(str(scale), encoding="ascii")
