@extends('emails.layout')
@section('title', 'Your CHATCO email has changed')
@section('eyebrow', 'Account update')
@section('accent', '#1A5FB4')
@section('preheader', 'Your registered CHATCO email address was updated.')
@section('content')
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Your registered email has changed</h1>
    <p style="font-size:15px;line-height:1.6;color:#475569;">Your CHATCO account now uses <strong>{{ $newEmail }}</strong>. This notification was sent to your previous email address for your security.</p>
    <p style="font-size:14px;line-height:1.6;color:#475569;">If you did not make this change, contact CHATCO admin support or visit the nearest CHATCO terminal immediately.</p>
@endsection
