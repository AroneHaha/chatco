@extends('emails.layout')

@section('title', 'Update on your CHATCO registration')
@section('eyebrow', 'Registration update')
@section('accent', '#dc2626')
@section('preheader', 'We reviewed your CHATCO registration and could not approve it this time.')

@section('content')
    <!-- Status mark -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
            <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; background-color:#fef2f2; border:1px solid #fecaca; border-radius:26px; font-size:26px; line-height:1; color:#dc2626; font-weight:700;">!</td>
        </tr>
    </table>

    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; line-height:1.3; color:#0f172a;">We couldn&rsquo;t approve your registration</h1>
    <p style="margin:0 0 22px; font-size:13px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; color:#dc2626;">Registration not approved</p>

    @include('emails.partials.message', ['body' => $body])

    @if ($showReason)
        <!-- Reason from the reviewing admin -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px; background-color:#fef2f2; border:1px solid #fecaca; border-radius:12px;">
            <tr>
                <td style="padding:16px 20px; border-left:4px solid #dc2626; border-radius:12px;">
                    <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#b91c1c;">Reason given</p>
                    <p style="margin:0; font-size:14px; line-height:1.6; color:#7f1d1d;">{{ $reason }}</p>
                </td>
            </tr>
        </table>
    @endif

    @if ($showNextSteps)
        <p style="margin:26px 0 10px; font-size:13px; font-weight:700; color:#0f172a;">What to do next</p>

        @if ($isBlocked)
            <!-- Cooldown: re-registration is paused, so lead with the wait -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px; background-color:#fffbeb; border:1px solid #fde68a; border-radius:12px;">
                <tr>
                    <td style="padding:16px 20px;">
                        <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#b45309;">Sign-ups temporarily paused</p>
                        <p style="margin:0; font-size:14px; line-height:1.6; color:#78350f;">{{ $nextSteps }}</p>
                    </td>
                </tr>
            </table>
        @else
            <p style="margin:0 0 16px; font-size:14px; line-height:1.65; color:#475569;">{{ $nextSteps }}</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
                <tr>
                    <td style="padding:18px 20px;">
                        <p style="margin:0 0 12px; font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#94a3b8;">Before you try again</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            @foreach ([
                                'Photograph your ID in good light &mdash; all four corners visible, no glare or blur.',
                                'Make sure the name and birthdate on the ID match what you typed in the form.',
                                'Use an ID that is still valid, and pick the fare type it actually proves (student, senior, or PWD).',
                            ] as $tip)
                                <tr>
                                    <td width="18" valign="top" style="padding:0 0 8px; font-size:14px; line-height:1.6; color:#1A5FB4;">&bull;</td>
                                    <td valign="top" style="padding:0 0 8px; font-size:14px; line-height:1.6; color:#475569;">{!! $tip !!}</td>
                                </tr>
                            @endforeach
                        </table>
                    </td>
                </tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                    <td align="center" style="background-color:#1A5FB4; border-radius:10px;">
                        <a href="{{ $signupUrl }}" target="_blank" rel="noopener" style="display:inline-block; padding:13px 30px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">Register again</a>
                    </td>
                </tr>
            </table>
        @endif
    @endif

    <p style="margin:0; padding-top:18px; border-top:1px solid #f1f5f9; font-size:12px; line-height:1.6; color:#94a3b8;">
        Think this was a mistake? Visit the CHATCO terminal office with your ID and our staff can review it with you in person.
    </p>
@endsection
