<?php
/**
 * Plugin Name: KRMF Companion
 * Description: Account-based KRMF calendar, planner and habits at /krmf/.
 * Version: 0.2.0
 * Requires PHP: 8.1
 */
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/protocol.php';

function krmf_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $table = $wpdb->prefix . 'krmf_notebooks';
    dbDelta("CREATE TABLE $table (
        user_id bigint(20) unsigned NOT NULL,
        body longtext NOT NULL,
        PRIMARY KEY  (user_id)
    ) ENGINE=InnoDB " . $wpdb->get_charset_collate() . ';');
    add_role('krmf_companion', 'KRMF member', ['read' => true, 'krmf_use' => true]);
}
register_activation_hook(__FILE__, 'krmf_install');
add_action('init', function () {
    $role = get_role('krmf_companion');
    if (!$role) {
        add_role('krmf_companion', 'KRMF member', ['read' => true, 'krmf_use' => true]);
    } elseif (!$role->has_cap('krmf_use')) {
        $role->add_cap('krmf_use');
    }
});

function krmf_allowed() {
    return is_user_logged_in() && (current_user_can('krmf_use') || current_user_can('manage_options'));
}
function krmf_user_id() { return get_current_user_id(); }
function krmf_private_headers() {
    nocache_headers();
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    do_action('litespeed_control_set_nocache', 'KRMF companion');
}
function krmf_login_url($action = '') {
    $url = home_url('/krmf/');
    return $action ? add_query_arg('krmf_action', $action, $url) : $url;
}
function krmf_client_key($purpose) {
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    return 'krmf_' . $purpose . '_' . hash_hmac('sha256', $ip, wp_salt('auth'));
}
function krmf_rate_limit($purpose, $limit, $seconds) {
    $key = krmf_client_key($purpose);
    $count = (int)get_transient($key);
    if ($count >= $limit) return false;
    set_transient($key, $count + 1, $seconds);
    return true;
}
function krmf_auth_page($mode = 'login', $message = '', $error = '') {
    krmf_private_headers();
    status_header($error ? 401 : 200);
    $base = plugins_url('web/', __FILE__);
    $dark = esc_url($base . 'art/classroom-night.png');
    $light = esc_url($base . 'art/classroom-indie.png');
    $title = $mode === 'register' ? 'Create your notebook' : ($mode === 'password' ? 'Change password' : 'Login');
    $action = esc_url(krmf_login_url($mode === 'login' ? '' : $mode));
    header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>KRMF · ' . esc_html($title) . '</title><style>
    @font-face{font-family:Pixelify;src:url("' . esc_url($base . 'fonts/PixelifySans.ttf') . '")}
    :root{color-scheme:dark;--paper:#302b3a;--ink:#f6ead6;--edge:#756880;--accent:#e7c78b;--input:#262230}
    *{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:22px;font-family:Pixelify,monospace;color:var(--ink);background:linear-gradient(#11131bb8,#171924e8),url("' . $dark . '") center/cover fixed}
    .card{width:min(430px,100%);padding:28px;background:color-mix(in srgb,var(--paper) 94%,transparent);border:3px solid var(--edge);box-shadow:8px 8px #0007}.logo{display:block;width:150px;height:auto;margin:0 auto 12px;image-rendering:pixelated}h1{text-align:center;font-size:27px;font-weight:500;margin:8px 0 22px}.notice,.error{padding:11px;margin:0 0 14px;border:2px solid var(--edge)}.error{border-color:#ca7b7b}.field{display:grid;gap:6px;margin:14px 0}.field input{width:100%;min-height:48px;padding:10px;font:18px Pixelify,monospace;color:var(--ink);background:var(--input);border:2px solid var(--edge);border-radius:0}.primary{width:100%;min-height:48px;margin-top:10px;font:19px Pixelify,monospace;color:var(--ink);background:var(--input);border:2px solid var(--accent);box-shadow:3px 3px #0005;cursor:pointer}.links{display:flex;flex-direction:column;gap:10px;margin-top:22px;text-align:center}.links a{color:var(--accent)}.trap{position:absolute;left:-9999px}.theme-toggle{position:fixed;top:18px;right:18px;display:flex;align-items:center;gap:8px;padding:8px 11px;background:var(--paper);border:2px solid var(--edge);box-shadow:3px 3px #0005;cursor:pointer}.theme-toggle input{position:absolute;opacity:0;pointer-events:none}.theme-track{width:36px;height:20px;padding:3px;border:2px solid currentColor}.theme-track i{display:block;width:10px;height:10px;background:currentColor}.theme-toggle input:checked+.theme-track i{margin-left:16px}.theme-label::after{content:"Dark"}
    body:has(#krmf-light:checked){color-scheme:light;--paper:#f8ecd6;--ink:#493b32;--edge:#a48b6b;--accent:#6b532b;--input:#fff6e6;background:linear-gradient(#eee1ca9c,#eee1caef),url("' . $light . '") center/cover fixed}body:has(#krmf-light:checked) .theme-label::after{content:"Light"}
    </style></head><body><label class="theme-toggle"><input id="krmf-light" type="checkbox" aria-label="Use light mode"><span class="theme-track"><i></i></span><span class="theme-label"></span></label><main class="card"><img class="logo" src="' . esc_url($base . 'art/krmf-logo.png') . '" alt="KRMF">';
    if ($mode !== 'login') echo '<h1>' . esc_html($title) . '</h1>';
    if ($message) echo '<p class="notice">' . esc_html($message) . '</p>';
    if ($error) echo '<p class="error" role="alert">' . esc_html($error) . '</p>';
    echo '<form method="post" action="' . $action . '">';
    wp_nonce_field('krmf_' . $mode, 'krmf_nonce');
    echo '<input type="hidden" name="krmf_form" value="' . esc_attr($mode) . '"><label class="trap">Website<input name="website" tabindex="-1" autocomplete="off"></label>';
    echo '<label class="field">Username<input name="username" autocomplete="username" required autofocus></label>';
    if ($mode === 'password') {
        echo '<label class="field">Current password<input name="current_password" type="password" autocomplete="current-password" required></label><label class="field">New password<input name="new_password" type="password" autocomplete="new-password" required></label><label class="field">Repeat new password<input name="new_password_confirm" type="password" autocomplete="new-password" required></label>';
    } else {
        echo '<label class="field">Password<input name="password" type="password" autocomplete="' . ($mode === 'register' ? 'new-password' : 'current-password') . '" required></label>';
        if ($mode === 'register') echo '<label class="field">Repeat password<input name="password_confirm" type="password" autocomplete="new-password" required></label>';
    }
    echo '<button class="primary" type="submit">' . ($mode === 'register' ? 'Create account' : ($mode === 'password' ? 'Change password' : 'Login')) . '</button></form><nav class="links">';
    if ($mode !== 'login') echo '<a href="' . esc_url(krmf_login_url()) . '">Back to sign in</a>';
    if ($mode === 'login') {
        echo '<a href="' . esc_url(krmf_login_url('register')) . '">Register</a>';
        echo '<a href="' . esc_url(krmf_login_url('password')) . '">Change password</a>';
    }
    echo '</nav></main></body></html>';
    exit;
}
function krmf_locked_message() {
    return 'This account is locked. Email efecan1senturk@gmail.com for help.';
}
function krmf_handle_auth() {
    $mode = sanitize_key($_POST['krmf_form'] ?? ($_GET['krmf_action'] ?? 'login'));
    if ($mode === 'logout') {
        if (is_user_logged_in() && wp_verify_nonce((string)($_GET['_wpnonce'] ?? ''), 'krmf_logout')) wp_logout();
        wp_safe_redirect(krmf_login_url()); exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        if (krmf_allowed() && $mode === 'login') return;
        krmf_auth_page(in_array($mode, ['register','password'], true) ? $mode : 'login');
    }
    if (!in_array($mode, ['login','register','password'], true) || !wp_verify_nonce((string)($_POST['krmf_nonce'] ?? ''), 'krmf_' . $mode)) {
        krmf_auth_page('login', '', 'Your session expired. Please try again.');
    }
    if (!empty($_POST['website'])) krmf_auth_page($mode, '', 'Registration could not be completed.');
    $username = trim((string)wp_unslash($_POST['username'] ?? ''));
    if ($mode === 'register') {
        if (!krmf_rate_limit('register', 5, HOUR_IN_SECONDS)) krmf_auth_page('register', '', 'Too many registrations from this connection. Try again later.');
        $password = (string)wp_unslash($_POST['password'] ?? '');
        $confirm = (string)wp_unslash($_POST['password_confirm'] ?? '');
        if (strlen($username) < 3 || strlen($username) > 32 || !validate_username($username) || sanitize_user($username, true) !== $username) krmf_auth_page('register', '', 'Use a username with 3–32 letters, numbers, underscores, hyphens or periods.');
        if ($password === '' || $password !== $confirm) krmf_auth_page('register', '', 'Enter the same password twice.');
        if (username_exists($username)) krmf_auth_page('register', '', 'That username is unavailable.');
        $user_id = wp_insert_user(['user_login'=>$username, 'user_pass'=>$password, 'user_email'=>'', 'role'=>'krmf_companion', 'display_name'=>$username]);
        if (is_wp_error($user_id)) krmf_auth_page('register', '', 'Account creation failed. Try another username.');
        wp_set_current_user($user_id); wp_set_auth_cookie($user_id, true, is_ssl());
        wp_safe_redirect(krmf_login_url()); exit;
    }
    $user = get_user_by('login', $username);
    if ($mode === 'password') {
        $current = (string)wp_unslash($_POST['current_password'] ?? '');
        $new = (string)wp_unslash($_POST['new_password'] ?? '');
        $confirm = (string)wp_unslash($_POST['new_password_confirm'] ?? '');
        if (!$user || get_user_meta($user->ID, 'krmf_locked', true)) krmf_auth_page('password', '', $user && get_user_meta($user->ID, 'krmf_locked', true) ? krmf_locked_message() : 'Username or current password is incorrect.');
        if (!wp_check_password($current, $user->user_pass, $user->ID)) krmf_auth_page('password', '', 'Username or current password is incorrect.');
        if ($new === '' || $new !== $confirm) krmf_auth_page('password', '', 'Enter the same new password twice.');
        wp_set_password($new, $user->ID);
        delete_user_meta($user->ID, 'krmf_failed_logins');
        wp_set_current_user($user->ID); wp_set_auth_cookie($user->ID, true, is_ssl());
        wp_safe_redirect(krmf_login_url()); exit;
    }
    if ($user && get_user_meta($user->ID, 'krmf_locked', true)) krmf_auth_page('login', '', krmf_locked_message());
    $password = (string)wp_unslash($_POST['password'] ?? '');
    if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
        if ($user) {
            $attempts = (int)get_user_meta($user->ID, 'krmf_failed_logins', true) + 1;
            update_user_meta($user->ID, 'krmf_failed_logins', $attempts);
            if ($attempts >= 2) {
                update_user_meta($user->ID, 'krmf_locked', 1);
                krmf_auth_page('login', '', krmf_locked_message());
            }
        }
        krmf_auth_page('login', '', 'Username or password is incorrect. One attempt remains.');
    }
    delete_user_meta($user->ID, 'krmf_failed_logins');
    wp_set_current_user($user->ID); wp_set_auth_cookie($user->ID, true, is_ssl());
    wp_safe_redirect(krmf_login_url()); exit;
}

add_action('rest_api_init', function () {
    register_rest_route('krmf/v1', '/sync', [
        'methods'=>'POST',
        'permission_callback'=>function () {
            if (!is_ssl()) return new WP_Error('krmf_https', 'HTTPS required', ['status'=>403]);
            return krmf_allowed() ? true : new WP_Error('krmf_private', 'Sign in to KRMF', ['status'=>401]);
        },
        'callback'=>function ($request) {
            global $wpdb;
            krmf_private_headers();
            if (strlen($request->get_body()) > 1048576) return new WP_Error('krmf_size', 'Batch too large', ['status'=>413]);
            $payload = $request->get_json_params();
            try { krmf_validate_request($payload); }
            catch (Throwable $e) { return new WP_Error('krmf_invalid', $e->getMessage(), ['status'=>400]); }
            $table = $wpdb->prefix . 'krmf_notebooks'; $user = krmf_user_id();
            try {
                if ($wpdb->query('START TRANSACTION') === false) throw new RuntimeException();
                if ($wpdb->query($wpdb->prepare("INSERT IGNORE INTO $table (user_id,body) VALUES (%d,%s)", $user, '{"records":{},"receipts":{}}')) === false) throw new RuntimeException();
                $body = $wpdb->get_var($wpdb->prepare("SELECT body FROM $table WHERE user_id=%d FOR UPDATE", $user));
                if (!is_string($body)) throw new RuntimeException();
                $state = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
                $reply = krmf_exchange($state, $payload);
                $encoded = wp_json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                if ($encoded === false || strlen($encoded) > 16 * 1024 * 1024) {
                    $wpdb->query('ROLLBACK');
                    return new WP_Error('krmf_capacity', 'Notebook storage is full.', ['status'=>507]);
                }
                if ($wpdb->update($table, ['body'=>$encoded], ['user_id'=>$user], ['%s'], ['%d']) === false) throw new RuntimeException();
                if ($wpdb->query('COMMIT') === false) throw new RuntimeException();
                $response = new WP_REST_Response($reply, 200);
                $response->header('Cache-Control', 'private, no-store, max-age=0');
                return $response;
            } catch (Throwable $e) {
                $wpdb->query('ROLLBACK');
                return new WP_Error('krmf_storage', 'Saving failed. Retry safely.', ['status'=>503]);
            }
        }
    ]);
});

add_action('template_redirect', function () {
    $root = rtrim((string)parse_url(home_url('/krmf/'), PHP_URL_PATH), '/');
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if ($path !== $root && $path !== $root . '/' && $path !== $root . '/sw.js') return;
    if ($path === $root) { wp_safe_redirect(home_url('/krmf/')); exit; }
    if (!is_ssl()) { wp_safe_redirect(set_url_scheme(home_url('/krmf/'), 'https')); exit; }
    krmf_private_headers();
    if ($path === $root . '/sw.js') {
        header('Content-Type: application/javascript; charset=utf-8');
        header('Service-Worker-Allowed: ' . $root . '/');
        readfile(__DIR__ . '/web/sw.js'); exit;
    }
    krmf_handle_auth();
    if (!krmf_allowed()) krmf_auth_page('login');
    $file = __DIR__ . '/web/index.html';
    if (!is_file($file)) { status_header(503); exit('Companion assets have not been built.'); }
    status_header(200);
    header('X-KRMF-Shell: 1');
    $base = plugins_url('web/', __FILE__);
    $user = wp_get_current_user();
    $session = [
        'user'=>krmf_user_id(),
        'username'=>$user->user_login,
        'endpoint'=>rest_url('krmf/v1/sync'),
        'nonce'=>wp_create_nonce('wp_rest'),
        'logout'=>wp_nonce_url(krmf_login_url('logout'), 'krmf_logout'),
        'password'=>krmf_login_url('password'),
        'site'=>home_url('/')
    ];
    $html = file_get_contents($file);
    $html = str_replace(['src="./', 'href="./'], ['src="'.esc_url($base), 'href="'.esc_url($base)], $html);
    $json = wp_json_encode($session, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT);
    $script = 'window.KRMF_SESSION=' . $json . ';';
    $bootstrap = '<script id="krmf-session">' . $script . '</script>';
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-" . base64_encode(hash('sha256', $script, true)) . "'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    echo str_replace('</head>', $bootstrap . '</head>', $html); exit;
}, 0);
