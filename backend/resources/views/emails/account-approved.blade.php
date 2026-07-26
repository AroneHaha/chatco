@extends('emails.layout')

@section('title', 'Your CHATCO account is approved')
@section('eyebrow', 'Account approved')
@section('accent', '#16a34a')
@section('preheader', 'Your CHATCO commuter account has been verified — you can log in and start riding.')

@section('content')
    <!-- Verified mark -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
            <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; background-color:#ecfdf3; border:1px solid #bbf7d0; border-radius:26px; font-size:26px; line-height:1; color:#16a34a; font-weight:700;">&#10003;</td>
        </tr>
    </table>

    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; line-height:1.3; color:#0f172a;">You&rsquo;re verified and ready to ride</h1>
    <p style="margin:0 0 22px; font-size:13px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; color:#16a34a;">Registration approved</p>

    @include('emails.partials.message', ['body' => $body])

    <!-- Account summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 26px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
        <tr>
            <td style="padding:18px 20px;">
                <p style="margin:0 0 14px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#94a3b8;">Account summary</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding:0 0 10px; font-size:13px; color:#64748b;">Name</td>
                        <td align="right" style="padding:0 0 10px; font-size:13px; font-weight:600; color:#0f172a;">{{ $name }}</td>
                    </tr>
                    <tr>
                        <td style="padding:0 0 10px; font-size:13px; color:#64748b;">Email</td>
                        <td align="right" style="padding:0 0 10px; font-size:13px; font-weight:600; color:#0f172a;">{{ $email }}</td>
                    </tr>
                    @if ($showCommuterType)
                        <tr>
                            <td style="padding:0 0 10px; font-size:13px; color:#64748b;">Fare type</td>
                            <td align="right" style="padding:0 0 10px;">
                                <span style="display:inline-block; padding:3px 10px; background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:0.4px; color:#1A5FB4;">{{ $commuterType }}</span>
                            </td>
                        </tr>
                    @endif
                    <tr>
                        <td style="font-size:13px; color:#64748b;">Verified on</td>
                        <td align="right" style="font-size:13px; font-weight:600; color:#0f172a;">{{ $verifiedAt }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Call to action -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
        <tr>
            <td align="center" style="background-color:#1A5FB4; border-radius:10px;">
                <a href="{{ $loginUrl }}" target="_blank" rel="noopener" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">Log in to CHATCO</a>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#0f172a;">What you can do now</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;">
        @foreach ([
            'Book a ride and pay cashless with GCash, or scan your cash receipt to log the trip.',
            'Track your rides and earn a free ride once you complete a reward cycle.',
            'Report a lost item or raise an SOS straight from the app if you ever need help.',
        ] as $item)
            <tr>
                <td width="18" valign="top" style="padding:0 0 8px; font-size:14px; line-height:1.6; color:#16a34a;">&bull;</td>
                <td valign="top" style="padding:0 0 8px; font-size:14px; line-height:1.6; color:#475569;">{{ $item }}</td>
            </tr>
        @endforeach
    </table>

    <p style="margin:0; padding-top:18px; border-top:1px solid #f1f5f9; font-size:12px; line-height:1.6; color:#94a3b8;">
        Didn&rsquo;t sign up for CHATCO? Let the terminal office know right away so we can close this account.
    </p>
@endsection
