# 🔍 Deepgram API Error Diagnostics

## Current Error
```
Deepgram failed: {"success":false,"error":"Internal Server Error","message":"Deepgram API error: {\"__dgError\":true,\"name\":\"DeepgramError\"}","details":"Please check the audio file format and ensure it contains speech."}
```

## Possible Issues

### 1. **API Key Issues** ❓
- **Invalid API Key**: The key might be expired, revoked, or incorrect
- **Wrong Key Format**: Deepgram API keys typically start with `c` or `f`
- **Missing Permissions**: The key might not have transcription permissions

**Check:**
```bash
# In your .env file, verify:
DEEPGRAM_API_KEY=your_key_here

# Check if key starts with 'c' or 'f'
# Check key length (should be around 40+ characters)
```

### 2. **Video File Format Issues** ❓
- **Unsupported Format**: Deepgram might not support the video format
- **File Too Large**: File might exceed size limits
- **Corrupted File**: Video file might be corrupted
- **No Audio Track**: Video might not have an audio track

**Supported Formats:**
- Video: MP4, MOV, AVI, MKV (with audio)
- Audio: MP3, WAV, FLAC, M4A, OGG

### 3. **API Request Issues** ❓
- **Buffer Format**: The ArrayBuffer might not be in the correct format
- **Missing Encoding**: Might need to specify encoding parameter
- **SDK Version**: SDK version might have compatibility issues

### 4. **Network/API Issues** ❓
- **API Downtime**: Deepgram API might be experiencing issues
- **Rate Limiting**: Too many requests
- **Quota Exceeded**: API quota might be exceeded

## Diagnostic Steps

### Step 1: Check API Key
1. Go to [Deepgram Console](https://console.deepgram.com/)
2. Verify your API key is active
3. Check if key has transcription permissions
4. Verify key format matches expected pattern

### Step 2: Check Video File
1. Verify video has audio track
2. Check file format is supported
3. Verify file is not corrupted
4. Check file size (should be < 500MB for most plans)

### Step 3: Check Backend Logs
Look for these log messages:
- `🔑 Deepgram API Key check:` - Shows key validation
- `📊 Buffer info:` - Shows buffer size
- `❌ Deepgram transcription error:` - Shows full error details
- `❌ Full Deepgram error object:` - Shows complete error structure

### Step 4: Test with Simple Audio File
Try uploading a simple MP3 or WAV file to see if the issue is format-specific.

## Code Improvements Made

1. ✅ **Enhanced Error Logging**: Now logs full error object with all properties
2. ✅ **API Key Validation**: Checks key format and logs key info
3. ✅ **Buffer Validation**: Checks buffer size before sending
4. ✅ **Detailed Error Extraction**: Tries multiple methods to extract error details

## Next Steps

1. **Check Backend Logs**: Look for the detailed error logs we added
2. **Verify API Key**: Check Deepgram console for key status
3. **Test with Different File**: Try a simple audio file (MP3/WAV)
4. **Check API Status**: Visit Deepgram status page
5. **Review Error Details**: The enhanced logging should show the actual error

## Common Solutions

### If API Key is Invalid:
```bash
# Get new key from Deepgram Console
# Update .env file
DEEPGRAM_API_KEY=new_key_here
# Restart server
```

### If File Format is Issue:
- Convert video to MP4 with AAC audio
- Or extract audio to MP3/WAV first
- Ensure file has audio track

### If SDK Issue:
```bash
# Update SDK version
npm install @deepgram/sdk@latest
```

---

**The enhanced error logging should now show the actual error details in your backend logs. Check the logs to see what the real issue is!**


