<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to a commuter the moment an admin approves their registration.
 *
 * The prose ($body) comes from the admin-editable `account_approved_template`
 * setting; everything around it — the verified mark, account summary, and the
 * login button — is fixed layout. AdminService renders the placeholders and
 * decides whether the fare-type row is needed (it isn't when the admin's own
 * template already spells the type out).
 *
 * Delivery is transport-agnostic: with MAIL_MAILER=log the rendered HTML lands
 * in storage/logs/laravel.log, so the flow is testable without SMTP.
 */
class AccountApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $body,
        public string $name,
        public string $email,
        public string $commuterType,
        public string $verifiedAt,
        public bool $showCommuterType = true,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your CHATCO account is approved',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-approved',
            with: [
                'body'             => $this->body,
                'name'             => $this->name,
                'email'            => $this->email,
                'commuterType'     => $this->commuterType,
                'verifiedAt'       => $this->verifiedAt,
                'showCommuterType' => $this->showCommuterType,
                'loginUrl'         => config('app.frontend_url').'/login',
            ],
        );
    }
}
