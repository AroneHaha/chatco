<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to an applicant when an admin rejects their registration.
 *
 * The prose ($body) comes from the admin-editable `account_rejected_template`
 * setting. The reason callout and the "what to do next" block are only rendered
 * when the admin's template does NOT already contain the matching placeholder —
 * otherwise the commuter would read the same sentence twice.
 *
 * $isBlocked flips the next-steps block from "try again" (with a Register again
 * button) to a cooldown notice, because RegistrationGuard has paused re-signup
 * for this email + contact number until a date the copy names.
 */
class AccountRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $body,
        public string $reason,
        public string $nextSteps,
        public bool $isBlocked = false,
        public bool $showReason = true,
        public bool $showNextSteps = true,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Update on your CHATCO registration',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-rejected',
            with: [
                'body'          => $this->body,
                'reason'        => $this->reason,
                'nextSteps'     => $this->nextSteps,
                'isBlocked'     => $this->isBlocked,
                'showReason'    => $this->showReason,
                'showNextSteps' => $this->showNextSteps,
                'signupUrl'     => config('app.frontend_url').'/signup',
            ],
        );
    }
}
