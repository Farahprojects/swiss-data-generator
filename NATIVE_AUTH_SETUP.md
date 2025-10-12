# Native OAuth Setup Guide

## ✅ Code Implementation: DONE
Native SDK integration is complete. Now you need to configure the native projects.

---

## 📱 Google Sign-In Setup

### Step 1: Get OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services > Credentials**
4. You need **3 OAuth Client IDs**:
   - ✅ **Web Client** (you probably have this)
   - 🆕 **iOS Client** (for native iOS app)
   - 🆕 **Android Client** (for native Android app)

### Step 2: Configure iOS (10 min)

1. **Update the code** (`src/lib/capacitorAuth.ts` line 13):
   ```typescript
   clientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
   ```
   Replace with your **Web Client ID** from Google Console

2. **Add URL Scheme** to `ios/App/App/Info.plist`:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <!-- Reverse of your iOS Client ID -->
         <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
       </array>
     </dict>
   </array>
   ```

3. **Open Xcode**:
   ```bash
   npx cap open ios
   ```
   Build and test!

### Step 3: Configure Android (10 min)

1. **Get SHA-1 fingerprint**:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copy the SHA-1 from "debug" variant

2. **Add SHA-1 to Google Console**:
   - Go to your Android OAuth Client
   - Add the SHA-1 fingerprint
   - Save

3. **Update `android/app/src/main/res/values/strings.xml`**:
   ```xml
   <resources>
     <string name="app_name">Therai</string>
     <string name="title_activity_main">Therai</string>
     <string name="package_name">com.therai.app</string>
     <string name="custom_url_scheme">com.therai.app</string>
     <!-- Add this -->
     <string name="server_client_id">YOUR_WEB_CLIENT_ID.apps.googleusercontent.com</string>
   </resources>
   ```

4. **Open Android Studio**:
   ```bash
   npx cap open android
   ```
   Build and test!

---

## 🍎 Apple Sign-In Setup

### iOS Setup (5 min)

1. **Enable Apple Sign-In** in Xcode:
   - Open `ios/App/App.xcodeproj` in Xcode
   - Select your app target
   - Go to **Signing & Capabilities**
   - Click **+ Capability**
   - Add **Sign in with Apple**

2. **Enable in Apple Developer Portal**:
   - Go to [Apple Developer](https://developer.apple.com/)
   - Certificates, Identifiers & Profiles
   - Select your App ID
   - Enable **Sign in with Apple**
   - Save

3. **Configure Supabase**:
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable Apple
   - Add Service ID (your app bundle: `com.therai.app`)

### Android Setup
Apple Sign-In on Android works through web flow - no extra config needed!

---

## 🔧 Final Steps

1. **Sync Capacitor**:
   ```bash
   npx cap sync
   ```

2. **Build and Test**:
   ```bash
   # iOS
   npx cap open ios
   # Build in Xcode, run on device/simulator
   
   # Android
   npx cap open android
   # Build in Android Studio, run on device/emulator
   ```

---

## ✅ How to Verify It Works

1. Open your app on a physical device
2. Tap "Sign in with Google"
3. **Native Google UI should appear** (not browser!)
4. Sign in
5. App should authenticate immediately

Same for Apple Sign-In!

---

## 🆘 Troubleshooting

### Google: "Error 10"
- Wrong Client ID or SHA-1 fingerprint
- Solution: Double-check credentials in Google Console

### Google: "Sign in cancelled"  
- URL scheme mismatch
- Solution: Check `Info.plist` has correct reversed Client ID

### Apple: "Invalid client"
- Not enabled in App ID
- Solution: Enable Sign in with Apple in Developer Portal

---

## 📚 References

- [Google Sign-In Plugin Docs](https://github.com/CodetrixStudio/CapacitorGoogleAuth)
- [Apple Sign-In Plugin Docs](https://github.com/capacitor-community/apple-sign-in)
- [Supabase Native Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

