@extends('emails.layout')

@section('title', 'Your CHATCO verification code')
@section('eyebrow', 'Verify your email')
@section('accent', '#1A5FB4')
@section('preheader', 'Enter this code to finish creating your CHATCO account — it expires in ' . $expiresInMinutes . ' minutes.')

@section('content')
    <!-- Verification mark -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
            <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:26px; font-size:24px; line-height:1;">&#9993;</td>
        </tr>
    </table>

    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; line-height:1.3; color:#0f172a;">Confirm your email address</h1>
    <p style="margin:0 0 22px; font-size:13px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; color:#1A5FB4;">One step left to sign up</p>

    <p style="margin:0 0 24px; font-size:15px; line-height:1.65; color:#475569;">
        Someone &mdash; hopefully you &mdash; is creating a CHATCO commuter account with this email address. Enter the code below in the sign-up form to carry on.
    </p>

    <!-- Code -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
        <tr>
            <td align="center" style="padding:24px 16px; background-color:#f0f6ff; border:1px solid #cfe0fa; border-radius:14px;">
                <p style="margin:0 0 10px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#5b86c4;">Your code</p>
                <p style="margin:0 0 12px; font-size:34px; font-weight:800; letter-spacing:10px; line-height:1.1; color:#1A5FB4; font-family:'Courier New',Courier,monospace;">{{ $code }}</p>
                <span style="display:inline-block; padding:4px 12px; background-color:#ffffff; border:1px solid #cfe0fa; border-radius:999px; font-size:12px; font-weight:600; color:#1A5FB4;">Expires in {{ $expiresInMinutes }} minutes</span>
            </td>
        </tr>
    </table>

    <!-- What happens next -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#94a3b8;">After you enter the code</p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">
                    You&rsquo;ll set a username and password, and your registration goes to an admin for ID review. We&rsquo;ll email you the moment it&rsquo;s approved.
                </p>
            </td>
        </tr>
    </table>

    <p style="margin:0; padding-top:18px; border-top:1px solid #f1f5f9; font-size:12px; line-height:1.6; color:#94a3b8;">
        Didn&rsquo;t try to sign up? Ignore this email &mdash; no account is created until this code is entered, and CHATCO staff will never ask you for it.
    </p>
@endsection
