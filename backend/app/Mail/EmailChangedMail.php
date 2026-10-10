<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $newEmail) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your CHATCO registered email has changed');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.email-changed');
    }
}
