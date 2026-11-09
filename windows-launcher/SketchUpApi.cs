using System.Runtime.InteropServices;

static class SketchUpApi
{
    public const string Library = "SketchUpAPI.dll";
    [StructLayout(LayoutKind.Sequential)] public struct Point { public double X, Y, Z; }
    [StructLayout(LayoutKind.Sequential)] public struct Color { public byte R, G, B, A; }

    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern void SUInitialize();
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern void SUTerminate();
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUModelCreateFromFileWithStatus(ref nint model, [MarshalAs(UnmanagedType.LPUTF8Str)] string path, out int status);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUModelRelease(ref nint model);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUModelGetEntities(nint model, out nint entities);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetNumFaces(nint entities, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetFaces(nint entities, nuint size, [Out] nint[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetNumGroups(nint entities, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetGroups(nint entities, nuint size, [Out] nint[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetNumInstances(nint entities, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUEntitiesGetInstances(nint entities, nuint size, [Out] nint[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUGroupGetEntities(nint group, out nint entities);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUGroupGetTransform(nint group, [Out] double[] transform);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUGroupGetName(nint group, ref nint name);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUComponentInstanceGetDefinition(nint instance, out nint definition);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUComponentDefinitionGetEntities(nint definition, out nint entities);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUComponentDefinitionGetName(nint definition, ref nint name);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUComponentInstanceGetName(nint instance, ref nint name);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUComponentInstanceGetTransform(nint instance, [Out] double[] transform);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern nint SUFaceToDrawingElement(nint value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern nint SUGroupToDrawingElement(nint value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern nint SUComponentInstanceToDrawingElement(nint value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUDrawingElementGetHidden(nint element, [MarshalAs(UnmanagedType.I1)] out bool value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUDrawingElementGetLayer(nint element, out nint layer);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SULayerGetVisibility(nint layer, [MarshalAs(UnmanagedType.I1)] out bool value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SULayerGetName(nint layer, ref nint name);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUDrawingElementGetMaterial(nint element, out nint material);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUFaceGetFrontMaterial(nint face, out nint material);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUFaceGetBackMaterial(nint face, out nint material);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperCreate(ref nint mesh, nint face);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperRelease(ref nint mesh);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetNumVertices(nint mesh, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetNumTriangles(nint mesh, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetVertices(nint mesh, nuint size, [Out] Point[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetVertexIndices(nint mesh, nuint size, [Out] nuint[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetNormals(nint mesh, nuint size, [Out] Point[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetFrontSTQCoords(nint mesh, nuint size, [Out] Point[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMeshHelperGetBackSTQCoords(nint mesh, nuint size, [Out] Point[] values, out nuint count);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMaterialGetColor(nint material, out Color color);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMaterialGetOpacity(nint material, out double opacity);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMaterialGetUseOpacity(nint material, [MarshalAs(UnmanagedType.I1)] out bool use);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUMaterialGetTexture(nint material, out nint texture);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUTextureWriteToFile(nint texture, [MarshalAs(UnmanagedType.LPUTF8Str)] string path);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUStringCreate(ref nint value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUStringRelease(ref nint value);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUStringGetUTF8Length(nint value, out nuint length);
    [DllImport(Library, CallingConvention = CallingConvention.Cdecl)]
    public static extern int SUStringGetUTF8(nint value, nuint length, [Out] byte[] bytes, out nuint written);
}
