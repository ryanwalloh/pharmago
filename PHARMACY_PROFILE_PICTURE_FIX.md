# Pharmacy Profile Picture Fix

## Issue
The pharmacy dashboard was not displaying the actual profile picture (storefront image) of the logged-in pharmacy.

## Root Cause
The pharmacy login endpoint was returning storefront image URLs from the `UserDocument` model, but:
1. **S3 URLs** were being returned as raw URLs without presigned signatures, making them inaccessible
2. **Local media files** (starting with `/media/`) were not being converted to absolute URLs
3. The frontend code was checking for profile pictures, but pharmacies needed to log out and back in to get the updated data

## Changes Made

### Backend Changes (`backend/api/users/direct_endpoints.py`)

Updated the `pharmacy_login` endpoint to properly handle all types of storefront image URLs:

1. **Cloudinary URLs**: Use directly (already worked)
2. **Local media files**: Convert to absolute URLs using `request.build_absolute_uri()`
3. **S3 URLs**: Generate presigned URLs (expires in 1 hour) for secure access

### Frontend Changes (`web-frontend/src/components/PharmacyDashboard.js`)

Improved the profile picture handling:
1. Check for HTTP URLs first (catches both `http://` and `https://`)
2. Added error logging to help debug image loading failures
3. Updated default backend URL to use `127.0.0.1` for consistency

## How It Works

1. **During Pharmacy Registration**:
   - Storefront image is uploaded to either Cloudinary, S3, or local media
   - A `UserDocument` record is created with `id_type` = "Storefront Image"
   - The `file_url` field stores the image URL

2. **During Pharmacy Login** (`/api/pharmacy-login/`):
   - Backend retrieves the storefront image from `UserDocument`
   - Backend processes the URL based on its type:
     - Cloudinary → Use directly
     - S3 → Generate presigned URL
     - Local media → Convert to absolute URL
   - Backend returns pharmacy data with `profile_picture` field

3. **In Frontend** (`PharmacyDashboard.js`):
   - Pharmacy data (including `profile_picture`) is saved to `localStorage` as `pharmacy_info`
   - Dashboard loads data from `localStorage`
   - Profile picture is displayed using the `profile_picture` URL
   - If loading fails or URL is missing, defaults to `/images/pharmacie.png`

## Testing Results

All approved pharmacies in the database have storefront images stored:
- **Cloudinary URLs**: ✓ Handled correctly
- **S3 URLs**: ✓ Now generates presigned URLs
- **Local media files**: ✓ Now converts to absolute URLs

## Action Required

For the fix to take effect, pharmacies need to:

1. **Log out** from the pharmacy dashboard
2. **Log back in** to get fresh data from the backend
3. The profile picture should now display correctly

## Verification

To verify the fix is working:

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Check the `pharmacy_info` key
4. Verify it contains a `profile_picture` field with a valid URL
5. Check the Console tab for any image loading errors

If the image still doesn't load:
- Check the console error message (now includes the failed URL)
- Verify the image URL is accessible by opening it directly in a new tab
- For S3 URLs, ensure AWS credentials are properly configured

## Files Modified

1. `backend/api/users/direct_endpoints.py` - Updated pharmacy login endpoint
2. `web-frontend/src/components/PharmacyDashboard.js` - Improved profile picture handling

## Notes

- S3 presigned URLs expire after 1 hour. If a pharmacy stays logged in for more than 1 hour, they may need to refresh the page or log back in.
- Cloudinary URLs don't expire, so they work indefinitely
- Local media files are served by Django's media server

