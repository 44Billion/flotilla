package social.flotilla;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import social.flotilla.notifications.AndroidPushFallbackPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AndroidPushFallbackPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
