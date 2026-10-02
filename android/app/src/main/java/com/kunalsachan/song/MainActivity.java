package com.kunalsachan.song;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
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
