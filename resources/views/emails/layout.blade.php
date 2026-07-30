<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>@yield('title', 'CHATCO')</title>
</head>
{{--
    Shared shell for every transactional email CHATCO sends.

    Email clients (Gmail in particular) strip <style> blocks and don't support
    flexbox/grid, so the whole thing is nested tables + inline styles on purpose.
    Children fill in five sections:

      title      — <title> / fallback subject text
      preheader  — the grey preview line the inbox shows next to the subject
      eyebrow    — small label in the header bar (e.g. "Account update")
      accent     — hex colour of the strip under the header, sets the tone
      content    — the body of the card
--}}
<body style="margin:0; padding:0; width:100%; background-color:#eef2f7; -webkit-font-smoothing:antialiased; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

    {{-- Inbox preview text. Hidden in the rendered body by the zero-size box. --}}
    <div style="display:none; max-height:0; max-width:0; overflow:hidden; opacity:0; color:transparent; height:0; width:0;">@yield('preheader')</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f7; padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:18px; overflow:hidden; border:1px solid #e2e8f0;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:#1A5FB4; padding:24px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="font-size:23px; font-weight:800; color:#ffffff; letter-spacing:1.5px; line-height:1.2;">CHATCO</td>
                                    <td align="right" style="font-size:10px; font-weight:700; color:#a9c9f0; letter-spacing:1.5px; text-transform:uppercase;">@yield('eyebrow', 'Notification')</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Accent strip: colour-codes the email at a glance -->
                    <tr>
                        <td height="4" style="height:4px; line-height:4px; font-size:0; background-color:@yield('accent', '#1A5FB4');">&nbsp;</td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            @yield('content')
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 32px 24px; background-color:#fafbfc; border-top:1px solid #eef2f7;">
                            <p style="margin:0 0 6px; font-size:12px; line-height:1.6; color:#64748b;">
                                Need a hand? Just reply to your registration contact or visit the CHATCO terminal office.
                            </p>
                            <p style="margin:0; font-size:11px; line-height:1.6; color:#9ca3af;">
                                &copy; {{ date('Y') }} CHATCO &middot; This is an automated message &mdash; please don&rsquo;t reply directly.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
