<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The 6-digit code that proves a sign-up applicant owns the email they typed.
 *
 * Sent at step 2 of the sign-up form, before any account exists — so unlike
 * the other transactional emails there is no user to address by name, and the
 * copy stays deliberately anonymous. Shares the layout in
 * resources/views/emails/layout.blade.php with the rest of the emails.
 */
class EmailVerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public int $expiresInMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your CHATCO verification code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-verification-code',
            with: [
                'code' => $this->code,
                'expiresInMinutes' => $this->expiresInMinutes,
            ],
        );
    }
}
