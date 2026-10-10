@extends('emails.layout')
@section('title', 'Verify your CHATCO email change')
@section('eyebrow', 'Account security')
@section('accent', '#1A5FB4')
@section('preheader', 'Your email change verification code expires in ' . $expiresInMinutes . ' minutes.')
@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">{{ $stage === 'old' ? 'Confirm it is you' : 'Verify your new email' }}</h1>
    <p style="font-size:15px;line-height:1.6;color:#475569;">{{ $stage === 'old' ? 'Enter this code in CHATCO to confirm ownership of your account before changing its registered email.' : 'Enter this code in CHATCO to confirm that you own this new email address.' }}</p>
    <p style="padding:24px;background:#f0f6ff;text-align:center;font-family:monospace;font-size:34px;letter-spacing:8px;font-weight:700;color:#1A5FB4;">{{ $code }}</p>
    <p style="font-size:13px;line-height:1.6;color:#475569;">This code expires in {{ $expiresInMinutes }} minutes. Your registered email will only change after all verification steps are complete.</p>
    <p style="font-size:12px;line-height:1.6;color:#64748b;">If you did not request this change, do not share or enter this code. CHATCO staff will never ask you for it.</p>
@endsection
