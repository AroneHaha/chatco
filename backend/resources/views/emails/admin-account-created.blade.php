@extends('emails.layout')

@section('title', 'Your CHATCO admin account is ready')
@section('eyebrow', 'Admin account created')
@section('accent', '#1A5FB4')
@section('preheader', 'Sign in with the temporary password below and set a new password to activate your admin account.')

@section('content')
    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; line-height:1.3; color:#0f172a;">Your CHATCO admin account is ready</h1>
    <p style="margin:0 0 22px; font-size:15px; line-height:1.6; color:#334155;">Hi {{ $name }}, an administrator created your CHATCO admin account. Use the credentials below to sign in.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 14px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#94a3b8;">Your sign-in details</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding:0 0 10px; font-size:13px; color:#64748b;">Email</td>
                        <td align="right" style="padding:0 0 10px; font-size:13px; font-weight:600; color:#0f172a;">{{ $email }}</td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 10px; font-size:13px; color:#64748b;">Username</td>
                        <td align="right" style="padding:0 0 10px; font-size:13px; font-weight:600; color:#0f172a;">{{ $username }}</td>
                    </tr>
                    <tr>
                        <td style="font-size:13px; color:#64748b;">Temporary password</td>
                        <td align="right" style="font-size:14px; font-weight:700; font-family:'Courier New',Courier,monospace; color:#0f172a;">{{ $defaultPassword }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 22px; font-size:14px; line-height:1.6; color:#334155;"><strong>You must set a new password the first time you sign in.</strong> Until then, access to Admin modules is blocked.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
        <tr>
            <td align="center" style="background-color:#1A5FB4; border-radius:10px;">
                <a href="{{ $loginUrl }}" target="_blank" rel="noopener" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">Sign in to CHATCO</a>
            </td>
        </tr>
    </table>

    <p style="margin:0; font-size:12px; line-height:1.6; color:#94a3b8;">If you did not expect this email, do not sign in and contact the CHATCO office.</p>
@endsection
