<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Replaces the seeded "Where does CHATCO operate?" FAQ with the first/last
 * trip hours. FaqSeeder skips once any FAQ exists, so existing databases only
 * get the new copy through this update. Matches the original question text,
 * so a row an admin already edited in FAQ Management is left alone.
 */
return new class extends Migration
{
    private const OLD_QUESTION = 'Where does CHATCO operate?';
    private const OLD_ANSWER = 'We\'re currently on the Calumpit–Meycauayan route in Bulacan with 34 official stop points. More routes coming soon!';
    private const NEW_QUESTION = 'What time is the first trip and last trip?';
    private const NEW_ANSWER = 'The first trip starts at 4:10 AM on weekdays and 5:00 AM on weekends. Trips run until 9:00 PM every day.';

    public function up(): void
    {
        DB::table('faq_items')
            ->where('question', self::OLD_QUESTION)
            ->update([
                'question' => self::NEW_QUESTION,
                'answer' => self::NEW_ANSWER,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('faq_items')
            ->where('question', self::NEW_QUESTION)
            ->where('answer', self::NEW_ANSWER)
            ->update([
                'question' => self::OLD_QUESTION,
                'answer' => self::OLD_ANSWER,
                'updated_at' => now(),
            ]);
    }
};
