using System.Diagnostics;
using System.Net;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    private static string Address = "http://127.0.0.1:4173";
    private static int Port = 4173;

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SetCurrentProcessExplicitAppUserModelID(string appId);

    [STAThread]
    private static void Main(string[] args)
    {
        if (args is ["--convert-sketchup", var sdk, var source, var output])
        {
            Environment.ExitCode = SketchUpImport.ConvertFile(sdk, source, output);
            return;
        }
        ApplicationConfiguration.Initialize();
        SetCurrentProcessExplicitAppUserModelID("InfiniteCanvasNotes.Desktop");
        if (args is ["--port", var port] && int.TryParse(port, out var number) && number is >= 1024 and <= 65535)
        {
            Port = number;
            Address = "http://127.0.0.1:" + Port;
        }
        using var mutex = new Mutex(true, @"Local\InfiniteCanvasNotesDesktop", out var first);
        using var activate = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\InfiniteCanvasNotesDesktopActivate");
        if (!first) { activate.Set(); return; }
        WebApplication? server = null;
        try
        {
            server = Task.Run(StartServer).GetAwaiter().GetResult();
            using var window = new CanvasWindow();
            var watcher = ThreadPool.RegisterWaitForSingleObject(activate, (_, _) =>
            {
                if (window.IsHandleCreated && !window.IsDisposed)
                    window.BeginInvoke(() => { window.WindowState = FormWindowState.Normal; window.Activate(); });
            }, null, Timeout.Infinite, false);
            try { Application.Run(window); }
            finally { watcher.Unregister(null); }
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message,
                "Infinite Canvas Notes", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.ExitCode = 1;
        }
        finally
        {
            if (server != null)
                Task.Run(async () => { await server.StopAsync(TimeSpan.FromSeconds(5)); await server.DisposeAsync(); }).GetAwaiter().GetResult();
        }
    }

    private static async Task<WebApplication> StartServer()
    {
        var site = Path.Combine(AppContext.BaseDirectory, "site");
        if (!File.Exists(Path.Combine(site, "index.html"))) throw new IOException("应用文件缺失，请重新安装。");
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { ContentRootPath = site, WebRootPath = site, Args = [] });
        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, Port));
        var server = builder.Build();
        server.Use(async (context, next) =>
        {
            if (context.Request.Host.Value != "127.0.0.1:" + Port) { context.Response.StatusCode = 400; return; }
            context.Response.Headers.CacheControl = "no-store";
            await next();
        });
        server.MapGet("/.infinite-canvas-notes", () => "Infinite Canvas Notes Desktop 0.2.1");
        server.MapPost("/api/models/blender", context => BlenderImport.ConvertAsync(context, false));
        server.MapPost("/api/models/sketchup", context => BlenderImport.ConvertAsync(context, true));
        server.MapPost("/api/export/dwg", DwgExport.ConvertAsync);
        server.UseDefaultFiles();
        server.UseStaticFiles();
        try { await server.StartAsync(); return server; }
        catch (IOException error) { await server.DisposeAsync(); throw new InvalidOperationException($"本地端口 {Port} 被占用。请先退出旧版无限画布，再打开桌面版。", error); }
        catch { await server.DisposeAsync(); throw; }
    }

    private sealed class CanvasWindow : Form
    {
        private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
        public CanvasWindow()
        {
            Text = "Infinite Canvas Notes";
            Icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath!);
            Width = 1440;
            Height = 960;
            MinimumSize = new System.Drawing.Size(800, 600);
            StartPosition = FormStartPosition.CenterScreen;
            Controls.Add(browser);
            Shown += InitializeBrowser;
        }

        private async void InitializeBrowser(object? sender, EventArgs args)
        {
            try
            {
                var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "InfiniteCanvasNotes", "WebView2");
                var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profile);
                if (IsDisposed) return;
                await browser.EnsureCoreWebView2Async(environment);
                browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
                browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
                browser.CoreWebView2.DownloadStarting += (_, download) =>
                {
                    using var dialog = new SaveFileDialog
                    {
                        Title = "选择导出位置",
                        FileName = Path.GetFileName(download.ResultFilePath),
                        Filter = "所有文件 (*.*)|*.*",
                        OverwritePrompt = true,
                        RestoreDirectory = true,
                    };
                    download.Handled = true;
                    if (dialog.ShowDialog(this) == DialogResult.OK) download.ResultFilePath = dialog.FileName;
                    else download.Cancel = true;
                };
                browser.CoreWebView2.NewWindowRequested += (_, eventArgs) =>
                {
                    eventArgs.Handled = true;
                    OpenExternal(eventArgs.Uri);
                };
                browser.CoreWebView2.NavigationStarting += (_, eventArgs) =>
                {
                    if (Uri.TryCreate(eventArgs.Uri, UriKind.Absolute, out var uri) && uri.GetLeftPart(UriPartial.Authority) == Address) return;
                    eventArgs.Cancel = true;
                    OpenExternal(eventArgs.Uri);
                };
                browser.Source = new Uri(Address);
            }
            catch (Exception error)
            {
                if (IsDisposed) return;
                MessageBox.Show(this, "无法打开桌面画布。请重新运行安装包修复 WebView2 运行环境。\n" + error.Message, Text);
                Close();
            }
        }

        private static void OpenExternal(string value)
        {
            if (Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http")
                Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
    }
}
