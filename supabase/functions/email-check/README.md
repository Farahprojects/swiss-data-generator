
# Email Check Edge Function

This Edge Function checks for pending email changes and can optionally resend verification links.

## API

**Endpoint:** `/functions/v1/email-check`

**Method:** `POST`

**Request Body:**
```json
{
  "email": "user@example.com",  // Required: The email to check
  "resend": true                // Optional: Whether to resend verification if pending
}
```

**Responses:**

- `200 { status: "no_pending_change" }` - No pending email change found
- `200 { status: "pending" }` - Pending email change found (when resend is false)
- `200 { status: "resent" }` - Verification email was resent successfully
- `400 { error: "Email is required." }` - Missing email in request
- `500 { error: "Failed to query user.", details: "..." }` - Database error
- `500 { error: "Resend failed", details: "..." }` - Failed to resend verification

## Usage Notes

This function requires setting up a database function `admin_get_user_by_email` since direct access to `auth.users` is not allowed through the Supabase client.
