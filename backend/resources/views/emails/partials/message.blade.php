{{--
    Renders admin-authored template text as styled paragraphs.

    The approval / rejection copy lives in the settings table as plain text, so
    it arrives here with \n\n between paragraphs and single \n inside them. The
    text is escaped first (admins type it, but it still ends up in an HTML
    email) and only then turned into <br> — never the other way round.

    Expects: $body (string)
--}}
@foreach (preg_split('/\R\s*\R/', trim($body)) as $paragraph)
    @continue(trim($paragraph) === '')
    <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:#475569;">{!! nl2br(e(trim($paragraph))) !!}</p>
@endforeach
