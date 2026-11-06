package tj.navo.services;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;
public class MainActivity extends Activity {
 private WebView web; private ValueCallback<Uri[]> uploadCallback; private static final int PICK=42;
 @Override public void onCreate(Bundle state){super.onCreate(state);web=new WebView(this);setContentView(web);WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setMediaPlaybackRequiresUserGesture(false);s.setAllowFileAccess(false);s.setAllowContentAccess(true);web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,String url){if(url.startsWith("https://f0707.github.io/Navo-services/"))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception e){Toast.makeText(MainActivity.this,"Не удалось открыть ссылку",Toast.LENGTH_SHORT).show();}return true;}});web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> callback,FileChooserParams params){if(uploadCallback!=null)uploadCallback.onReceiveValue(null);uploadCallback=callback;try{startActivityForResult(params.createIntent(),PICK);return true;}catch(Exception e){uploadCallback=null;return false;}}});web.loadUrl("https://f0707.github.io/Navo-services/");}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==PICK&&uploadCallback!=null){uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));uploadCallback=null;}}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){web.destroy();super.onDestroy();}
}