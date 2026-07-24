<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password reset code</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1A5FB4; padding:28px 32px;">
                            <span style="font-size:24px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">CHATCO</span>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h1 style="margin:0 0 8px; font-size:20px; font-weight:700; color:#111827;">Reset your password</h1>
                            <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#6b7280;">
                                We received a request to reset your CHATCO password. Enter the code below to continue. If you didn&rsquo;t ask for this, you can safely ignore this email &mdash; your password won&rsquo;t change.
                            </p>

                            <!-- Code -->
                            <div style="text-align:center; margin:0 0 24px;">
                                <div style="display:inline-block; background-color:#f0f6ff; border:1px solid #cfe0fa; border-radius:12px; padding:16px 28px;">
                                    <span style="font-size:34px; font-weight:800; letter-spacing:10px; color:#1A5FB4; font-family:'Courier New',Courier,monospace;">{{ $code }}</span>
                                </div>
                            </div>

                            <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280;">
                                This code expires in <strong style="color:#111827;">{{ $expiresInMinutes }} minutes</strong>. For your security, never share it with anyone.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 32px; border-top:1px solid #f3f4f6;">
                            <p style="margin:0; font-size:12px; color:#9ca3af;">
                                &copy; {{ date('Y') }} CHATCO. This is an automated message &mdash; please don&rsquo;t reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
