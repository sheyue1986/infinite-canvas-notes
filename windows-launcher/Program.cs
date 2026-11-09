using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;

if (args is ["--convert-sketchup", var sdk, var source, var output])
{
    Environment.ExitCode = SketchUpImport.ConvertFile(sdk, source, output);
    return;
}

const string url = "http://127.0.0.1:4173";
const string healthPath = "/.infinite-canvas-notes";
const string appId = "Infinite Canvas Notes Local";
var site = Path.Combine(AppContext.BaseDirectory, "site");
var serveOnly = args.Contains("--serve-only");

try
{
    if (!File.Exists(Path.Combine(site, "index.html")))
        throw new InvalidOperationException("找不到应用文件。请保留启动器旁边的 site 文件夹。");

    using var client = new HttpClient(new HttpClientHandler { UseProxy = false })
    {
        Timeout = TimeSpan.FromSeconds(1)
    };

    if (await IsRunning())
    {
        if (!serveOnly) OpenCanvas();
        return;
    }

    var builder = WebApplication.CreateBuilder(new WebApplicationOptions
    {
        ContentRootPath = site,
        WebRootPath = site
    });
    builder.Logging.ClearProviders();
    builder.WebHost.ConfigureKestrel(server => server.Listen(IPAddress.Loopback, 4173));

    await using var app = builder.Build();
    app.Use(async (context, next) =>
    {
        if (!string.Equals(context.Request.Host.Value, "127.0.0.1:4173", StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }
        await next();
    });
    app.MapGet(healthPath, () => appId);
    app.MapPost("/api/models/blender", context => BlenderImport.ConvertAsync(context, false));
    app.MapPost("/api/models/sketchup", context => BlenderImport.ConvertAsync(context, true));
    app.UseDefaultFiles();
    app.UseStaticFiles();

    try
    {
        await app.StartAsync();
    }
    catch (IOException)
    {
        if (await IsRunning())
        {
            if (!serveOnly) OpenCanvas();
            return;
        }
        throw new InvalidOperationException("本地端口 4173 已被占用。请关闭占用该端口的程序后重试。");
    }

    if (!serveOnly) OpenCanvas();
    await app.WaitForShutdownAsync();

    async Task<bool> IsRunning()
    {
        try { return await client.GetStringAsync(url + healthPath) == appId; }
        catch (HttpRequestException) { return false; }
        catch (TaskCanceledException) { return false; }
    }
}
catch (Exception error)
{
    if (!serveOnly) MessageBox(IntPtr.Zero, error.Message, "Infinite Canvas Notes", 0x10);
    Environment.ExitCode = 1;
}

static void OpenCanvas()
{
    var chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
        "Google", "Chrome", "Application", "chrome.exe");
    if (File.Exists(chrome))
    {
        var launch = new ProcessStartInfo(chrome);
        launch.ArgumentList.Add("--app=" + url + "/");
        Process.Start(launch);
        return;
    }

    Process.Start(new ProcessStartInfo(url + "/") { UseShellExecute = true });
}

[DllImport("user32.dll", EntryPoint = "MessageBoxW", CharSet = CharSet.Unicode)]
static extern int MessageBox(IntPtr window, string text, string caption, uint type);

