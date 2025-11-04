# Production Build Debugging Guide

## 🎯 Problem: Can't See Console Logs in Production

You're absolutely right! Console logs are typically stripped or hidden in production builds. Here's how to debug:

---

## ✅ **Solution 1: On-Screen Debug Info (Added!)**

I've added **visible debug text** that shows on the loading screen. You'll now see:

### What You'll See on Screen:

```
[Loading spinner]

Loading order tracking...

Waiting 500ms for bridge... (PROD)
```

Then one of these:

**Success:**
```
Loading order tracking...

Success! Loaded in 523ms
```

**Error:**
```
Loading order tracking...

Error after 515ms: Cannot access Dimensions...
```

**Retry:**
```
Retrying...

Retrying with longer delay...
```

This info is **visible even in production builds!**

---

## ✅ **Solution 2: View Android Logs (If Needed)**

If you need more detailed logs from production, you can use `adb logcat`:

### Setup:

1. **Enable USB Debugging** on your Android device
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device** to computer via USB

3. **Run logcat** to see native logs:

```bash
# View all React Native logs
adb logcat | grep -i "ReactNative"

# View all logs (verbose)
adb logcat

# View only errors
adb logcat *:E

# Clear and view fresh logs
adb logcat -c && adb logcat | grep -i "ReactNative"
```

### What You'll See:

Even though JavaScript console.logs are stripped, you'll still see:
- Native crashes
- Native module errors
- React Native bridge issues
- Fatal exceptions

---

## ✅ **Solution 3: Error Reporting (Future)**

For production apps, consider adding:

**Sentry (Crash Reporting):**
```bash
npx expo install sentry-expo
```

Then errors are automatically sent to Sentry dashboard with full stack traces.

---

## 📊 What the Debug Info Shows

### Message Format:

```
[Status] after [time]ms: [details]
```

### Examples & Meaning:

| Message | Meaning | Action |
|---------|---------|--------|
| `Waiting 500ms for bridge... (PROD)` | Initial delay starting | ✅ Normal |
| `Loading module after 503ms...` | About to require() | ✅ Normal |
| `Success! Loaded in 523ms` | Module loaded! | ✅ Success! |
| `Error after 515ms: Cannot access Dimensions` | Dimensions accessed too early | ⚠️ Need more delay |
| `Error after 505ms: Proxy is not defined` | Proxy not supported | ⚠️ Need different approach |
| `Retrying with longer delay...` | First attempt failed, trying again | ⏳ Wait for retry |

---

## 🔍 What to Report After Testing

### If It Works:

✅ "Works! Screen loaded, saw this debug text: `Success! Loaded in 523ms`"

### If It Fails:

Share:
1. **Exact debug text** shown on screen
2. **What happened** (crashed, error screen, etc.)
3. **Screenshot** if possible

Example:
```
❌ Still crashes
Debug text showed: "Error after 515ms: Cannot access Dimensions before bridge..."
App closed after showing this message
```

---

## 📱 Testing Flow

### Step 1: Place Order
Normal flow, place a test order

### Step 2: Click "Proceed to Order Tracking"
Watch the loading screen

### Step 3: Read Debug Text
Under the spinner, you'll see debug info updating:

```
Waiting 500ms for bridge... (PROD)
  ↓ (500ms later)
Loading module after 503ms...
  ↓ (immediate)
Success! Loaded in 523ms
```

OR

```
Waiting 500ms for bridge... (PROD)
  ↓ (500ms later)
Loading module after 503ms...
  ↓ (immediate)
Error after 515ms: [error message]
```

### Step 4: Report Results
- If success: Note the timing (e.g., "523ms")
- If error: Screenshot the error message
- If crash: Note last debug text seen

---

## 🎓 Understanding the Timing

### Good Timings:

- `Success! Loaded in 500-600ms` ✅ Perfect!
- `Success! Loaded in 400-500ms` ✅ Good timing
- `Success! Loaded in 600-800ms` ✅ Slow but safe

### Problem Timings:

- `Error after 200-400ms` ⚠️ Bridge not ready, need more delay
- `Error after 500-600ms` ⚠️ Different issue, not just timing
- `Error after 0-100ms` ⚠️ Delay not working at all

---

## 🛠️ Advanced: Enable React DevTools (Optional)

For production debugging:

1. **Install React DevTools:**
   ```bash
   npm install -g react-devtools
   ```

2. **Connect to device:**
   ```bash
   adb reverse tcp:8097 tcp:8097
   react-devtools
   ```

3. **Shake device** → Enable "Debug Mode"

This works even in production builds if you enable debug mode manually.

---

## 📝 Summary

### You Will See:

1. ✅ **On-Screen Debug Info** - Always visible, even in production
2. ✅ **Error Messages** - If it fails, you'll see why
3. ✅ **Timing Info** - See how long things take

### You Won't Need:

- ❌ USB debugging (unless you want native logs)
- ❌ Special tools (debug info is on screen)
- ❌ Dev build (works in production build)

### What to Do:

1. **Build** new preview
2. **Test** order flow
3. **Read** debug text on loading screen
4. **Report** what you see

---

## 🎯 Expected Results

### Success:
```
[Spinner]
Loading order tracking...
Success! Loaded in 523ms

[Order tracking screen appears]
```

### Error (But We See It!):
```
[Spinner]
Loading order tracking...
Error after 515ms: Cannot access Dimensions...

[Error screen with message]
```

### Retry:
```
[Spinner]
Loading order tracking...
Error after 515ms: [error]

[Spinner]
Retrying...
Retrying with longer delay...

[Either succeeds or shows error screen]
```

---

## ✅ Ready to Test

The debug info is now **visible on screen** in production builds!

**No USB debugging needed** - just look at the text under the loading spinner.

**Build command:**
```bash
cd mobileapp
eas build --platform android --profile preview
```

Then test and report what debug text you see! 🚀

