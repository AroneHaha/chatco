<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Synchronous credentials email for an admin created from User Management. */
class AdminAccountCreatedMail extends Mailable
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
        return new Envelope(subject: 'Your CHATCO admin account is ready');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-account-created',
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
