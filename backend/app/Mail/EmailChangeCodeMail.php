<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailChangeCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public int $expiresInMinutes, public string $stage) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->stage === 'old' ? 'Confirm your CHATCO email change' : 'Verify your new CHATCO email');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.email-change-code');
    }
}
