<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The 6-digit code that confirms an already-logged-in commuter's password
 * change. Unlike EmailVerificationCodeMail (sent before any account exists),
 * a real account and inbox owner exist here, so the copy actively warns the
 * recipient if they didn't request this — the whole point of gating a
 * password change on the registered inbox instead of the session alone is
 * that the legitimate owner gets a chance to notice and react.
 */
class PasswordChangeCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public int $expiresInMinutes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirm your CHATCO password change',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-change-code',
            with: [
                'code' => $this->code,
                'expiresInMinutes' => $this->expiresInMinutes,
            ],
        );
    }
}
