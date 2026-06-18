<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

---

## ChatCo — Queue Worker

Sprint 2 broadcasts the `VehicleLocationUpdated` event via the
`ShouldBroadcast` interface (not `ShouldBroadcastNow`). This means every
GPS / capacity-status update from a conductor is pushed onto the
configured queue and dispatched to Pusher **asynchronously** by a queue
worker process — the conductor's HTTP response is not blocked by Pusher
network latency.

### Required setup

1. **Driver**: `QUEUE_CONNECTION=database` in `.env` (already set in
   `.env.example`). The `jobs` table migration ships with the framework
   (`database/migrations/0001_01_01_000002_create_jobs_table.php`) and
   is included in `php artisan migrate`.

2. **Run the worker** in a separate terminal/process:

   ```bash
   php artisan queue:work --queue=default --tries=3 --timeout=30
   ```

   Keep this terminal open while the backend is running. Every GPS
   update pushed onto the queue will be picked up and dispatched to
   Pusher, then delivered to subscribed commuter clients via Laravel
   Echo.

3. **Restart after code changes**: queue workers cache the application
   in memory. After deploying new code, restart the worker:

   ```bash
   php artisan queue:restart
   ```

   The running worker will finish the current job and exit; your
   process supervisor (see below) will start a fresh one.

### Production (Supervisor)

In production, run the worker under [Supervisor](https://laravel.com/docs/queues#supervisor-configuration)
so it auto-restarts on failure or server reboot. Example
`/etc/supervisor/conf.d/chatco-worker.conf`:

```ini
[program:chatco-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/chatco/backend/artisan queue:work --queue=default --tries=3 --timeout=30
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/chatco/backend/storage/logs/worker.log
stopwaitsecs=3600
```

Then `sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start chatco-worker:*`.

### Test environment

`phpunit.xml` sets `QUEUE_CONNECTION=sync` so the test suite runs
without a worker — broadcast events fire inline within the test
process. The `BroadcastTest::test_vehicle_location_updated_is_queued`
test uses `Queue::fake()` to verify the event is **pushed** to the
queue (rather than executed inline), even when the connection is sync.

### Troubleshooting

- **Commuter map not updating in real time**: the worker is not
  running, or `QUEUE_CONNECTION=sync` is set in `.env` (the event
  fires inline, which is fine functionally but blocks the conductor
  HTTP response — check `php artisan tinker` →
  `config('queue.default')`).
- **Jobs piling up in the `jobs` table**: the worker is down or
  crashing. Check `storage/logs/laravel.log` for exceptions, then
  `php artisan queue:retry all` after fixing the root cause.
- **Failed jobs**: `php artisan queue:failed` lists them;
  `php artisan queue:retry all` re-attempts; `php artisan queue:flush`
  purges them permanently.
