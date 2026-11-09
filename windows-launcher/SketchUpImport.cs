using System.Numerics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Microsoft.Win32;
using static SketchUpApi;

sealed class SketchUpImport(string work)
{
    const int MaxVertices = 4_000_000;
    readonly Dictionary<string, Dictionary<nint, Geometry>> groups = new();
    readonly Dictionary<nint, int> materialIds = new();
    readonly List<object> materials = [], images = [], textures = [], views = [], accessors = [];
    readonly Dictionary<nint, string> layers = new();
    int vertices;

    sealed class Geometry
    {
        public readonly List<Vector3> Positions = [];
        public readonly List<Vector2> Uvs = [];
        public readonly List<Vector3> Normals = [];
    }
    delegate int NativeName(nint entity, ref nint name);
    delegate int CountEntities(nint entities, out nuint count);
    delegate int GetEntities(nint entities, nuint size, nint[] values, out nuint count);
    delegate int GetTransform(nint entity, double[] values);

    public static string? FindLibrary()
    {
        var locations = new List<string> {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "SketchUp", "SketchUp 2023")
        };
        foreach (var hive in new[] { Registry.LocalMachine, Registry.CurrentUser })
        {
            using var uninstall = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
            if (uninstall is null) continue;
            foreach (var key in uninstall.GetSubKeyNames())
            {
                using var item = uninstall.OpenSubKey(key);
                if (item?.GetValue("DisplayName") is string title && title.StartsWith("SketchUp 2023", StringComparison.OrdinalIgnoreCase) &&
                    item.GetValue("InstallLocation") is string folder && Path.IsPathFullyQualified(folder))
                    locations.Add(folder);
            }
        }
        return locations.Select(folder => Path.Combine(folder, Library)).FirstOrDefault(File.Exists);
    }

    public static int ConvertFile(string dll, string source, string output)
    {
        try
        {
            var handle = LoadLibraryEx(Path.GetFullPath(dll), 0, 0x00000100 | 0x00001000);
            if (handle == 0) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            NativeLibrary.SetDllImportResolver(typeof(SketchUpApi).Assembly, (name, _, _) => name == Library ? handle : 0);
            SUInitialize();
            nint model = 0;
            try
            {
                Check(SUModelCreateFromFileWithStatus(ref model, source, out _));
                Check(SUModelGetEntities(model, out var entities));
                var converter = new SketchUpImport(Path.GetDirectoryName(output)!);
                converter.Walk(entities, Matrix4x4.Identity, 0, null, 0);
                converter.Write(output);
                return 0;
            }
            finally
            {
                if (model != 0) SUModelRelease(ref model);
                SUTerminate();
            }
        }
        catch (Exception ex) { Console.Error.WriteLine(ex.Message); return 1; }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern nint LoadLibraryEx(string fileName, nint file, uint flags);

    static void Check(int result)
    {
        if (result != 0) throw new InvalidDataException("SketchUp API error " + result);
    }
    static string Name(nint entity, NativeName get)
    {
        nint name = 0;
        Check(SUStringCreate(ref name));
        try
        {
            if (get(entity, ref name) != 0 || SUStringGetUTF8Length(name, out var length) != 0 || length == 0 || length > 65536) return "";
            var bytes = new byte[(int)length + 1];
            if (SUStringGetUTF8(name, (nuint)bytes.Length, bytes, out _) != 0) return "";
            return Encoding.UTF8.GetString(bytes).TrimEnd('\0');
        }
        finally { SUStringRelease(ref name); }
    }
    static nint[] Entries(nint entities, CountEntities count, GetEntities get)
    {
        Check(count(entities, out var size));
        if (size == 0) return [];
        if (size > MaxVertices) throw new InvalidDataException("Too many SketchUp entities");
        var values = new nint[(int)size];
        Check(get(entities, size, values, out var actual));
        return actual == size ? values : values[..(int)actual];
    }
    static bool Visible(nint drawing) =>
        !(SUDrawingElementGetHidden(drawing, out var hidden) == 0 && hidden) &&
        !(SUDrawingElementGetLayer(drawing, out var layer) == 0 && SULayerGetVisibility(layer, out var visible) == 0 && !visible);

    static Matrix4x4 Matrix(nint entity, GetTransform get)
    {
        var m = new double[16];
        Check(get(entity, m));
        return new Matrix4x4(
            (float)m[0], (float)m[1], (float)m[2], (float)m[3], (float)m[4], (float)m[5], (float)m[6], (float)m[7],
            (float)m[8], (float)m[9], (float)m[10], (float)m[11], (float)m[12], (float)m[13], (float)m[14], (float)m[15]);
    }
    string Layer(nint drawing)
    {
        if (SUDrawingElementGetLayer(drawing, out var layer) != 0) return "SketchUp";
        if (!layers.TryGetValue(layer, out var name)) layers[layer] = name = Name(layer, SULayerGetName);
        return string.IsNullOrEmpty(name) ? "SketchUp" : name;
    }
    static nint Inherited(nint element, nint fallback) =>
        SUDrawingElementGetMaterial(element, out var material) == 0 ? material : fallback;

    void Walk(nint entities, Matrix4x4 transform, nint parentMaterial, string? groupName, int depth)
    {
        if (depth > 96) throw new InvalidDataException("SketchUp component hierarchy too deep");
        foreach (var face in Entries(entities, SUEntitiesGetNumFaces, SUEntitiesGetFaces))
        {
            var drawing = SUFaceToDrawingElement(face);
            if (!Visible(drawing)) continue;
            Face(face, transform, parentMaterial, groupName ?? Layer(drawing));
        }
        foreach (var group in Entries(entities, SUEntitiesGetNumGroups, SUEntitiesGetGroups))
        {
            var drawing = SUGroupToDrawingElement(group);
            if (!Visible(drawing)) continue;
            Check(SUGroupGetEntities(group, out var child));
            var name = groupName ?? Name(group, SUGroupGetName);
            Walk(child, Matrix(group, SUGroupGetTransform) * transform, Inherited(drawing, parentMaterial),
                string.IsNullOrEmpty(name) ? Layer(drawing) : name, depth + 1);
        }
        foreach (var instance in Entries(entities, SUEntitiesGetNumInstances, SUEntitiesGetInstances))
        {
            var drawing = SUComponentInstanceToDrawingElement(instance);
            if (!Visible(drawing)) continue;
            Check(SUComponentInstanceGetDefinition(instance, out var definition));
            Check(SUComponentDefinitionGetEntities(definition, out var child));
            var name = groupName ?? Name(instance, SUComponentInstanceGetName);
            if (string.IsNullOrEmpty(name)) name = Name(definition, SUComponentDefinitionGetName);
            Walk(child, Matrix(instance, SUComponentInstanceGetTransform) * transform, Inherited(drawing, parentMaterial),
                string.IsNullOrEmpty(name) ? Layer(drawing) : name, depth + 1);
        }
    }

    void Face(nint face, Matrix4x4 transform, nint inherited, string group)
    {
        var front = SUFaceGetFrontMaterial(face, out var material) == 0;
        var back = !front && inherited == 0 && SUFaceGetBackMaterial(face, out material) == 0;
        if (!front && !back) material = inherited;
        nint mesh = 0;
        Check(SUMeshHelperCreate(ref mesh, face));
        try
        {
            Check(SUMeshHelperGetNumVertices(mesh, out var count));
            Check(SUMeshHelperGetNumTriangles(mesh, out var triangles));
            if (count == 0 || triangles == 0) return;
            if (count > MaxVertices || triangles > (nuint)(MaxVertices - vertices) / 3) throw new InvalidDataException("Too many SketchUp triangles");
            var points = new Point[(int)count];
            var stq = new Point[(int)count];
            var normals = new Point[(int)count];
            var indices = new nuint[(int)triangles * 3];
            Check(SUMeshHelperGetVertices(mesh, count, points, out _));
            SUMeshHelperGetNormals(mesh, count, normals, out _);
            var normalMatrix = Matrix4x4.Invert(transform, out var inverse) ? Matrix4x4.Transpose(inverse) : Matrix4x4.Identity;
            Check(SUMeshHelperGetVertexIndices(mesh, (nuint)indices.Length, indices, out _));
            if (back) SUMeshHelperGetBackSTQCoords(mesh, count, stq, out _);
            else SUMeshHelperGetFrontSTQCoords(mesh, count, stq, out _);
            if (!groups.TryGetValue(group, out var primitives)) groups[group] = primitives = new();
            if (!primitives.TryGetValue(material, out var geom)) primitives[material] = geom = new();
            var mirror = transform.GetDeterminant() < 0;
            for (int i = 0; i < indices.Length; i += 3)
            {
                Add((int)indices[i]);
                Add((int)indices[i + (mirror ? 2 : 1)]);
                Add((int)indices[i + (mirror ? 1 : 2)]);
            }
            vertices += indices.Length;

            void Add(int index)
            {
                var point = points[index];
                var p = Vector4.Transform(new Vector4((float)point.X, (float)point.Y, (float)point.Z, 1), transform);
                var scale = 0.0254f / (Math.Abs(p.W) > 1e-10f ? p.W : 1);
                var v = new Vector3(p.X * scale, p.Z * scale, -p.Y * scale);
                if (!float.IsFinite(v.X) || !float.IsFinite(v.Y) || !float.IsFinite(v.Z)) throw new InvalidDataException("Invalid vertex");
                geom.Positions.Add(v);
                var normal = normals[index];
                var n = Vector3.TransformNormal(new Vector3((float)normal.X, (float)normal.Y, (float)normal.Z), normalMatrix);
                n = n.LengthSquared() > 1e-12f ? Vector3.Normalize(n) : Vector3.UnitZ;
                geom.Normals.Add(new Vector3(n.X, n.Z, -n.Y));
                var uv = stq[index];
                double q = Math.Abs(uv.Z) > 1e-10 ? uv.Z : 1;
                geom.Uvs.Add(new Vector2((float)(uv.X / q), 1 - (float)(uv.Y / q)));
            }
        }
        finally { SUMeshHelperRelease(ref mesh); }
    }

    int Material(nint material, BinaryWriter data)
    {
        if (materialIds.TryGetValue(material, out var id)) return id;
        var color = new Color { R = 205, G = 206, B = 211, A = 255 };
        double opacity = 1;
        if (material != 0)
        {
            if (SUMaterialGetColor(material, out var rgb) == 0) color = rgb;
            if (SUMaterialGetUseOpacity(material, out var use) == 0 && use && SUMaterialGetOpacity(material, out var alpha) == 0)
                opacity = Math.Clamp(alpha, 0, 1);
        }
        var pbr = new Dictionary<string, object> { ["metallicFactor"] = 0, ["roughnessFactor"] = 0.82 };
        float[] channels = [Linear(color.R), Linear(color.G), Linear(color.B), (float)opacity];
        if (material != 0 && SUMaterialGetTexture(material, out var texture) == 0 && texture != 0)
        {
            var file = Path.Combine(work, "texture-" + materials.Count + ".png");
            if (SUTextureWriteToFile(texture, file) == 0 && File.Exists(file) && new FileInfo(file).Length is > 8 and <= 32 * 1024 * 1024)
            {
                var bytes = File.ReadAllBytes(file);
                var mime = bytes[0] == 137 && bytes[1] == 80 ? "image/png" : bytes[0] == 255 && bytes[1] == 216 ? "image/jpeg" : null;
                if (mime != null)
                {
                    var view = BufferView(data, bytes.Length);
                    data.Write(bytes);
                    images.Add(new { bufferView = view, mimeType = mime });
                    textures.Add(new { source = images.Count - 1 });
                    pbr["baseColorTexture"] = new { index = textures.Count - 1 };
                    channels = [1, 1, 1, (float)opacity];
                }
            }
        }
        pbr["baseColorFactor"] = channels;
        id = materials.Count;
        materials.Add(new { doubleSided = true, alphaMode = opacity < 1 ? "BLEND" : "OPAQUE", pbrMetallicRoughness = pbr });
        materialIds[material] = id;
        return id;
    }
    static float Linear(byte value)
    {
        var v = value / 255f;
        return v <= 0.04045f ? v / 12.92f : MathF.Pow((v + 0.055f) / 1.055f, 2.4f);
    }
    int BufferView(BinaryWriter data, int length)
    {
        while (data.BaseStream.Position % 4 != 0) data.Write((byte)0);
        var index = views.Count;
        views.Add(new { buffer = 0, byteOffset = data.BaseStream.Position, byteLength = length });
        return index;
    }

    void Write(string path)
    {
        if (vertices == 0) throw new InvalidDataException("No visible SketchUp faces");
        var meshes = new List<object>();
        var nodes = new List<object>();
        using var stream = new FileStream(path + ".bin", FileMode.Create, FileAccess.ReadWrite);
        using var data = new BinaryWriter(stream, Encoding.UTF8, true);
        foreach (var (name, objects) in groups)
        {
            var primitives = new List<object>();
            foreach (var (material, geom) in objects)
            {
                int count = geom.Positions.Count;
                var min = new Vector3(float.MaxValue);
                var max = new Vector3(float.MinValue);
                var posView = BufferView(data, count * 12);
                foreach (var p in geom.Positions)
                {
                    data.Write(p.X); data.Write(p.Y); data.Write(p.Z);
                    min = Vector3.Min(min, p); max = Vector3.Max(max, p);
                }
                int position = accessors.Count;
                accessors.Add(new { bufferView = posView, componentType = 5126, count, type = "VEC3",
                    min = new[] { min.X, min.Y, min.Z }, max = new[] { max.X, max.Y, max.Z } });
                var uvView = BufferView(data, count * 8);
                foreach (var uv in geom.Uvs) { data.Write(uv.X); data.Write(uv.Y); }
                int uvAccessor = accessors.Count;
                accessors.Add(new { bufferView = uvView, componentType = 5126, count, type = "VEC2" });
                var normalView = BufferView(data, count * 12);
                foreach (var n in geom.Normals) { data.Write(n.X); data.Write(n.Y); data.Write(n.Z); }
                int normal = accessors.Count;
                accessors.Add(new { bufferView = normalView, componentType = 5126, count, type = "VEC3" });
                primitives.Add(new { attributes = new { POSITION = position, NORMAL = normal, TEXCOORD_0 = uvAccessor }, material = Material(material, data) });
            }
            nodes.Add(new { name, mesh = meshes.Count });
            meshes.Add(new { primitives });
        }
        while (stream.Position % 4 != 0) data.Write((byte)0);
        if (stream.Length > 256L * 1024 * 1024) throw new InvalidDataException("Converted model is too large");
        var json = JsonSerializer.SerializeToUtf8Bytes(new {
            asset = new { version = "2.0" }, scene = 0, scenes = new[] { new { nodes = Enumerable.Range(0, nodes.Count).ToArray() } },
            nodes, meshes, materials, images, textures, bufferViews = views, accessors,
            buffers = new[] { new { byteLength = stream.Length } }
        });
        int pad = (4 - json.Length % 4) % 4;
        using var target = new BinaryWriter(File.Create(path));
        target.Write(0x46546c67); target.Write(2); target.Write(28 + json.Length + pad + (int)stream.Length);
        target.Write(json.Length + pad); target.Write(0x4e4f534a); target.Write(json);
        for (int i = 0; i < pad; i++) target.Write((byte)32);
        target.Write((int)stream.Length); target.Write(0x004e4942);
        data.Flush();
        stream.Position = 0;
        stream.CopyTo(target.BaseStream);
    }
}
