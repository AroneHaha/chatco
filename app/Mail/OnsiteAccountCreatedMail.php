<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent once when an admin creates a commuter account onsite. Carries the
 * system-generated default password, so it is deliberately NOT queued: a
 * queued job would persist the plaintext password in the jobs table. Send it
 * synchronously with Mail::to()->send().
 */
class OnsiteAccountCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $name,
        public string $email,
        public string $username,
        public string $defaultPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your CHATCO account is ready: set your password to activate it',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.onsite-account-created',
            with: [
                'name' => $this->name,
                'email' => $this->email,
                'username' => $this->username,
                'defaultPassword' => $this->defaultPassword,
                'loginUrl' => config('app.frontend_url').'/login',
            ],
        );
    }
}
