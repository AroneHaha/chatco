@extends('emails.layout')

@section('title', 'Your CHATCO password reset code')
@section('eyebrow', 'Security')
@section('accent', '#1A5FB4')
@section('preheader', 'Your one-time code is inside — it expires in ' . $expiresInMinutes . ' minutes.')

@section('content')
    {{--
        Icons here are drawn with tables, borders and border-radius instead of
        emoji or SVG: Gmail strips inline SVG and blocks remote images until the
        reader allows them, while plain styled boxes render everywhere (Outlook
        desktop just squares the corners).
    --}}

    <!-- Security mark: padlock -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
            <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:26px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr>
                        <td align="center" style="padding:0; font-size:0; line-height:0;">
                            <div style="width:10px; height:8px; margin:0 auto; border:3px solid #1A5FB4; border-bottom:0; border-radius:8px 8px 0 0; font-size:0; line-height:0;">&nbsp;</div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" valign="middle" style="width:22px; height:16px; background-color:#1A5FB4; border-radius:4px; font-size:0; line-height:0;">
                            <div style="width:4px; height:6px; margin:0 auto; background-color:#ffffff; border-radius:2px; font-size:0; line-height:0;">&nbsp;</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; line-height:1.3; color:#0f172a;">Reset your password</h1>
    <p style="margin:0 0 22px; font-size:13px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; color:#1A5FB4;">One-time verification code</p>

    <p style="margin:0 0 24px; font-size:15px; line-height:1.65; color:#475569;">
        We received a request to reset your CHATCO password. Use the code below to choose a new one.
    </p>

    <!-- Code -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
        <tr>
            <td align="center" style="padding:24px 16px 20px; background-color:#f0f6ff; border:1px solid #cfe0fa; border-radius:14px;">
                <p style="margin:0 0 10px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#475569;">Your code</p>
                <p style="margin:0 0 12px; font-size:34px; font-weight:800; letter-spacing:10px; line-height:1.1; color:#1A5FB4; font-family:'Courier New',Courier,monospace;">{{ $code }}</p>
                <p style="margin:0; font-size:13px; font-weight:600; color:#475569;">Expires in {{ $expiresInMinutes }} minutes</p>
            </td>
        </tr>
    </table>

    <!-- How to use it -->
    <p style="margin:0 0 12px; font-size:13px; font-weight:700; color:#0f172a;">How to use it</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        @foreach ([
            'Go back to the password reset screen in CHATCO.',
            'Enter the code above before it expires.',
            'Choose a new password you haven&rsquo;t used before.',
        ] as $step)
            <tr>
                <td width="36" valign="top" style="padding:0 0 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td width="24" height="24" align="center" valign="middle" style="width:24px; height:24px; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; font-size:12px; font-weight:700; line-height:1; color:#1A5FB4;">{{ $loop->iteration }}</td>
                        </tr>
                    </table>
                </td>
                <td valign="top" style="padding:3px 0 12px; font-size:14px; line-height:1.6; color:#475569;">{!! $step !!}</td>
            </tr>
        @endforeach
    </table>

    <!-- Security note -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px; background-color:#fffbeb; border:1px solid #fde68a; border-radius:12px;">
        <tr>
            <td width="52" valign="top" style="padding:16px 0 16px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td width="22" height="22" align="center" valign="middle" style="width:22px; height:22px; background-color:#b45309; border-radius:11px; font-size:13px; font-weight:800; line-height:1; color:#ffffff; font-family:Arial,Helvetica,sans-serif;">!</td>
                    </tr>
                </table>
            </td>
            <td valign="top" style="padding:16px 20px 16px 0;">
                <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#b45309;">Keep this code private</p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#78350f;">
                    CHATCO staff will never ask you for this code. Don&rsquo;t share it with anyone, even if they say they&rsquo;re from support.
                </p>
            </td>
        </tr>
    </table>

    <p style="margin:0; padding-top:18px; border-top:1px solid #f1f5f9; font-size:12px; line-height:1.6; color:#94a3b8;">
        Didn&rsquo;t ask for this? You can safely ignore this email &mdash; your password stays exactly as it is.
    </p>
@endsection
