package tj.navo.services;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.content.Intent;
import android.net.Uri;
public class MainActivity extends Activity {
 private WebView web;
 private static final String HOME="https://f0707.github.io/Navo-services/";
 @Override public void onCreate(Bundle b){super.onCreate(b); web=new WebView(this); setContentView(web); WebSettings s=web.getSettings(); s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setCacheMode(WebSettings.LOAD_DEFAULT); web.setWebChromeClient(new WebChromeClient()); web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();if("https".equalsIgnoreCase(u.getScheme())&&"f0707.github.io".equalsIgnoreCase(u.getHost()))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}});web.loadUrl(HOME);}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
}