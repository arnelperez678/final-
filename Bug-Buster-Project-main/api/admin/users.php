<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';
$method = method_is('GET', 'POST');
$admin = require_admin();

if ($method === 'GET') {
    $profiles = sb('GET', '/profiles?order=created_at.desc&limit=500&select=id,username,role,xp,seeds,streak,is_suspended,created_at,last_seen_at');
    $chapters = sb('GET', '/chapters?select=id,is_published');
    $published = [];
    foreach ($chapters as $chapter) if (!empty($chapter['is_published'])) $published[(int)$chapter['id']] = true;
    $lessons = sb('GET', '/lessons?select=id,chapter_id');
    $lessonIds = [];
    foreach ($lessons as $lesson) if (isset($published[(int)$lesson['chapter_id']])) $lessonIds[(int)$lesson['id']] = true;
    $done = [];
    foreach (sb('GET', '/user_progress?select=user_id,lesson_id,status') as $row) {
        if (($row['status'] ?? '') === 'done' && isset($lessonIds[(int)$row['lesson_id']])) {
            $id = (string)$row['user_id'];
            $done[$id] = ($done[$id] ?? 0) + 1;
        }
    }
    $users = [];
    foreach ($profiles as $profile) {
        $lastSeen = $profile['last_seen_at'] ?? null;
        $completed = $done[(string)$profile['id']] ?? 0;
        $total = count($lessonIds);
        $users[] = [
            'id' => (string)$profile['id'], 'username' => (string)$profile['username'],
            'role' => (string)$profile['role'], 'xp' => (int)$profile['xp'],
            'seeds' => (int)$profile['seeds'], 'streak' => (int)$profile['streak'],
            'is_suspended' => (bool)$profile['is_suspended'], 'created_at' => (string)$profile['created_at'],
            'last_seen_at' => $lastSeen,
            'is_online' => $lastSeen && strtotime((string)$lastSeen) >= time() - 90,
            'completed_levels' => $completed, 'total_levels' => $total,
            'progress_percent' => $total ? (int)round($completed / $total * 100) : 0,
        ];
    }
    json_out(['users' => $users, 'me' => (string)$admin['id']]);
}

$in = read_json();
$id = (string)($in['id'] ?? '');
$action = (string)($in['action'] ?? '');
if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) fail('Invalid user', 422);
$self = $id === (string)$admin['id'];
switch ($action) {
    case 'promote': $patch = ['role' => 'admin']; break;
    case 'demote': if ($self) fail('You cannot demote yourself', 422); $patch = ['role' => 'user']; break;
    case 'suspend': if ($self) fail('You cannot suspend yourself', 422); $patch = ['is_suspended' => true]; break;
    case 'unsuspend': $patch = ['is_suspended' => false]; break;
    case 'reset':
        if ($self) fail('You cannot reset your own progress here', 422);
        sb('DELETE', '/user_progress?user_id=eq.' . q($id));
        sb('DELETE', '/garden_plots?user_id=eq.' . q($id));
        $patch = ['xp' => 0, 'seeds' => 0, 'streak' => 0];
        break;
    default: fail('Unknown user action', 422);
}
$res = sb('PATCH', '/profiles?id=eq.' . q($id), $patch);
if (!$res) fail('User not found', 404);
json_out(['ok' => true, 'user' => $res[0]]);
?>
