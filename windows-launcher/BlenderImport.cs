using System.Globalization;
using System.Diagnostics;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Win32;

static class BlenderImport
{
    const long MaxBytes = 256L * 1024 * 1024;
    static readonly SemaphoreSlim Conversion = new(1);
    const string ImportOrigin = "http://127.0.0.1:4173";

    public static async Task ConvertAsync(HttpContext context, bool sketchUp)
    {
        var format = sketchUp ? "skp" : "blend";
        var request = context.Request;
        var response = context.Response;
        // Require a browser request from this application. A third-party form cannot submit these headers.
        if (request.Headers.Origin != ImportOrigin ||
            request.Headers["Sec-Fetch-Site"] != "same-origin" ||
            request.Headers["X-Infinite-Canvas-Import"] != format)
        {
            response.StatusCode = 403;
            return;
        }
        if (request.ContentType != "application/octet-stream" ||
            request.ContentLength is null or <= 0 or > MaxBytes)
        {
            await Fail(400, "size");
            return;
        }

        var sdk = sketchUp ? SketchUpImport.FindLibrary() : null;
        var executable = sketchUp ? Environment.ProcessPath : FindBlender();
        var script = Path.Combine(AppContext.BaseDirectory, "export-blender.py");
        if (executable is null || (sketchUp ? sdk is null : !File.Exists(script)))
        {
            await Fail(503, "unavailable");
            return;
        }
        if (!await Conversion.WaitAsync(0, context.RequestAborted))
        {
            await Fail(409, "busy");
            return;
        }

        var work = Path.Combine(Path.GetTempPath(), "icn-model-" + Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(work);
            var source = Path.Combine(work, "model." + format);
            var output = Path.Combine(work, "model.glb");
            var limit = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
            if (limit is { IsReadOnly: false }) limit.MaxRequestBodySize = MaxBytes;
            using var deadline = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
            deadline.CancelAfter(TimeSpan.FromMinutes(3));
            await using (var file = File.Create(source))
                await request.Body.CopyToAsync(file, deadline.Token);

            var start = new ProcessStartInfo(executable)
            {
                UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = work,
                RedirectStandardOutput = true, RedirectStandardError = true,
            };
            string[] arguments = sketchUp ? ["--convert-sketchup", sdk!, source, output] : [
                "--background", "--factory-startup", "--disable-autoexec", source,
                "--python-exit-code", "1", "--python", script, "--", output
            ];
            foreach (var argument in arguments) start.ArgumentList.Add(argument);

            using var process = Process.Start(start) ?? throw new InvalidOperationException();
            var stdout = process.StandardOutput.BaseStream.CopyToAsync(Stream.Null);
            var stderr = process.StandardError.BaseStream.CopyToAsync(Stream.Null);
            try
            {
                await process.WaitForExitAsync(deadline.Token);
                await Task.WhenAll(stdout, stderr);
            }
            catch (OperationCanceledException)
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                    await process.WaitForExitAsync();
                }
                await Task.WhenAll(stdout, stderr);
                throw;
            }

            if (process.ExitCode != 0 || !File.Exists(output) || new FileInfo(output).Length is <= 12 or > MaxBytes)
            {
                await Fail(422, "conversion");
                return;
            }
            var scaleFile = Path.ChangeExtension(output, ".scale");
            if (File.Exists(scaleFile))
            {
                var raw = await File.ReadAllTextAsync(scaleFile, deadline.Token);
                if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var scale) &&
                    double.IsFinite(scale) && scale > 0)
                    response.Headers["X-Infinite-Canvas-Meters-Per-Unit"] = scale.ToString("R", CultureInfo.InvariantCulture);
            }
            response.Headers.CacheControl = "no-store";
            response.ContentType = "model/gltf-binary";
            await response.SendFileAsync(output, deadline.Token);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
        catch (OperationCanceledException) when (!response.HasStarted) { await Fail(408, "timeout"); }
        catch (Exception) when (!response.HasStarted) { await Fail(422, "conversion"); }
        finally
        {
            try { if (Directory.Exists(work)) Directory.Delete(work, recursive: true); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
            Conversion.Release();
        }

        async Task Fail(int status, string code)
        {
            response.StatusCode = status;
            await response.WriteAsJsonAsync(new { code }, context.RequestAborted);
        }
    }

    static string? FindBlender()
    {
        var candidates = new List<string>();
        foreach (var hive in new[] { Registry.LocalMachine, Registry.CurrentUser })
        {
            using var uninstall = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
            if (uninstall is null) continue;
            foreach (var name in uninstall.GetSubKeyNames())
            {
                using var product = uninstall.OpenSubKey(name);
                if (product?.GetValue("DisplayName") is string title &&
                    title.StartsWith("Blender", StringComparison.OrdinalIgnoreCase) &&
                    product.GetValue("InstallLocation") is string folder && Path.IsPathFullyQualified(folder))
                    candidates.Add(Path.Combine(folder, "blender.exe"));
            }
        }
        var installed = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Blender Foundation");
        if (Directory.Exists(installed))
            candidates.AddRange(Directory.GetDirectories(installed, "Blender*").Select(folder => Path.Combine(folder, "blender.exe")));
        return candidates.Where(File.Exists)
            .OrderByDescending(path => FileVersionInfo.GetVersionInfo(path).FileMajorPart)
            .ThenByDescending(path => FileVersionInfo.GetVersionInfo(path).FileMinorPart)
            .FirstOrDefault();
    }
}
