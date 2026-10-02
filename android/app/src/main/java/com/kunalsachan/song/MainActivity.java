package com.kunalsachan.song;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_CODE_SAVE_FILE = 9001;
    private static final int REQUEST_CODE_STORAGE_PERMISSION = 9002;

    private static class PendingDownload {
        String url;
        String filename;
        String mimeType;

        PendingDownload(String url, String filename, String mimeType) {
            this.url = url;
            this.filename = filename;
            this.mimeType = mimeType;
        }
    }

    private PendingDownload pendingDownload = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupDownloader();
        handleDeepLink(getIntent());
    }

    @Override
    public void onStart() {
        super.onStart();
        setupDownloader();
    }

    private void setupDownloader() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new DownloaderInterface(), "AndroidDownloader");
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    if (filename == null || !filename.toLowerCase().endsWith(".mp3")) {
                        filename = "song.mp3";
                    }
                    promptSaveLocation(url, filename, mimetype != null ? mimetype : "audio/mpeg");
                }
            });
        }
    }

    public class DownloaderInterface {
        @JavascriptInterface
        public void downloadFile(final String url, final String filename, final String mimeType) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    promptSaveLocation(url, filename, mimeType != null ? mimeType : "audio/mpeg");
                }
            });
        }
    }

    public void promptSaveLocation(String url, String filename, String mimeType) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                this.pendingDownload = new PendingDownload(url, filename, mimeType);
                requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQUEST_CODE_STORAGE_PERMISSION);
                return;
            }
        }

        this.pendingDownload = new PendingDownload(url, filename, mimeType);
        try {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "audio/mpeg");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            startActivityForResult(intent, REQUEST_CODE_SAVE_FILE);
        } catch (Exception e) {
            Toast.makeText(this, "Could not open file picker: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_STORAGE_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingDownload != null) {
                    promptSaveLocation(pendingDownload.url, pendingDownload.filename, pendingDownload.mimeType);
                }
            } else {
                Toast.makeText(this, "Storage permission is required to save downloads", Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_CODE_SAVE_FILE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri destinationUri = data.getData();
                if (pendingDownload != null) {
                    final String downloadUrl = pendingDownload.url;
                    final String fileName = pendingDownload.filename;
                    pendingDownload = null;
                    startDownloadToUri(downloadUrl, destinationUri, fileName);
                }
            } else {
                pendingDownload = null;
            }
        }
    }

    private void startDownloadToUri(final String downloadUrl, final Uri destinationUri, final String fileName) {
        Toast.makeText(this, "Downloading “" + fileName + "”…", Toast.LENGTH_SHORT).show();

        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection conn = null;
                InputStream in = null;
                OutputStream out = null;
                try {
                    String fullUrl = downloadUrl;
                    if (fullUrl.startsWith("/")) {
                        fullUrl = "https://5ong.vercel.app" + fullUrl;
                    }
                    URL url = new URL(fullUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setInstanceFollowRedirects(true);
                    conn.setRequestProperty("User-Agent", "5ONG-Android/2.0");

                    int responseCode = conn.getResponseCode();
                    // Handle redirects manually if needed
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == HttpURLConnection.HTTP_MOVED_TEMP || responseCode == 307) {
                        String newUrl = conn.getHeaderField("Location");
                        conn.disconnect();
                        url = new URL(newUrl);
                        conn = (HttpURLConnection) url.openConnection();
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setInstanceFollowRedirects(true);
                    }

                    in = conn.getInputStream();
                    out = getContentResolver().openOutputStream(destinationUri);
                    if (out == null) {
                        throw new Exception("Unable to open destination file");
                    }

                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "Saved: " + fileName, Toast.LENGTH_LONG).show();
                        }
                    });
                } catch (final Exception e) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(MainActivity.this, "Download error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                } finally {
                    try {
                        if (in != null) in.close();
                    } catch (Exception ignored) {}
                    try {
                        if (out != null) out.close();
                    } catch (Exception ignored) {}
                    if (conn != null) conn.disconnect();
                }
            }
        }).start();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri != null) {
            String scheme = uri.getScheme();
            if ("song".equalsIgnoreCase(scheme) || "com.kunalsachan.song".equalsIgnoreCase(scheme)) {
                String token = uri.getQueryParameter("token");
                String error = uri.getQueryParameter("error");
                String redirectTarget = "https://5ong.vercel.app/auth/callback";
                if (token != null) {
                    redirectTarget += "?token=" + Uri.encode(token);
                } else if (error != null) {
                    redirectTarget += "?error=" + Uri.encode(error);
                }
                final String finalUrl = redirectTarget;
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(new Runnable() {
                        @Override
                        public void run() {
                            getBridge().getWebView().loadUrl(finalUrl);
                        }
                    });
                }
            }
        }
    }
}
