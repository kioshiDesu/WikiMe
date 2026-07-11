package com.wikime.app;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "SaveToDownloads")
public class SaveToDownloadsPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");

        if (data == null || filename == null) {
            call.reject("Missing required parameters");
            return;
        }

        try {
            String uri = writeToDownloads(data, filename);
            JSObject ret = new JSObject();
            ret.put("uri", uri);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to save: " + e.getMessage(), e);
        }
    }

    private String writeToDownloads(String data, String filename) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return writeViaMediaStore(data, filename);
        } else {
            return writeDirectPath(data, filename);
        }
    }

    private String writeViaMediaStore(String data, String filename) throws Exception {
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            throw new Exception("Failed to create MediaStore entry");
        }

        try (OutputStream os = getContext().getContentResolver().openOutputStream(uri)) {
            if (os == null) {
                throw new Exception("Failed to open output stream");
            }
            os.write(data.getBytes(StandardCharsets.UTF_8));
        }

        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        getContext().getContentResolver().update(uri, values, null, null);

        return uri.toString();
    }

    private String writeDirectPath(String data, String filename) throws Exception {
        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadsDir.exists()) {
            downloadsDir.mkdirs();
        }
        File file = new File(downloadsDir, filename);
        try (FileOutputStream fos = new FileOutputStream(file)) {
            fos.write(data.getBytes(StandardCharsets.UTF_8));
        }
        return file.getAbsolutePath();
    }
}
