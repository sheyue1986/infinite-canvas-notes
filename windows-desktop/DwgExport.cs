using System.Diagnostics;
internal static class DwgExport
{
    internal static async Task ConvertAsync(HttpContext context)
    {
        var converter = Path.Combine(AppContext.BaseDirectory, "cad-tools", "dxf2dwg.exe");
        if (!File.Exists(converter)) { context.Response.StatusCode = 503; await context.Response.WriteAsync("DWG 转换组件缺失，请修复安装。"); return; }
        var root = Path.Combine(Path.GetTempPath(), "InfiniteCanvasNotes-CAD");
        var job = Path.Combine(root, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(job);
        try
        {
            var input = Path.Combine(job, "drawing.dxf");
            var output = Path.Combine(job, "drawing.dwg");
            await using (var file = File.Create(input)) await context.Request.Body.CopyToAsync(file, context.RequestAborted);
            var start = new ProcessStartInfo(converter) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, WorkingDirectory = job };
            foreach (var arg in new[] { "-y", "--as", "r2000", "-o", output, input }) start.ArgumentList.Add(arg);
            using var process = Process.Start(start)!;
            var stdout = process.StandardOutput.ReadToEndAsync(); var stderr = process.StandardError.ReadToEndAsync();
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted); timeout.CancelAfter(TimeSpan.FromSeconds(60));
            try { await process.WaitForExitAsync(timeout.Token); }
            catch { if (!process.HasExited) process.Kill(true); throw; }
            await Task.WhenAll(stdout, stderr);
            if (!File.Exists(output) || new FileInfo(output).Length < 100) throw new IOException("转换器未生成 DWG，请使用 DXF 导出检查图形。");
            context.Response.ContentType = "application/acad";
            await context.Response.SendFileAsync(output, context.RequestAborted);
        }
        catch (Exception error) { if (!context.Response.HasStarted) { context.Response.StatusCode = 422; await context.Response.WriteAsync("DWG 导出失败：" + error.Message); } }
        finally { if (Path.GetDirectoryName(Path.GetFullPath(job)) == Path.GetFullPath(root)) try { Directory.Delete(job, true); } catch { } }
    }
}
