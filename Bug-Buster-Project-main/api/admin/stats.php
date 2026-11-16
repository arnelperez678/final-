<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';
method_is('GET');
require_admin();
$profiles = sb('GET', '/profiles?select=id,username,role,created_at,is_suspended,seeds,last_seen_at');
$chapters = sb('GET', '/chapters?order=sort_order.asc,id.asc&select=id,title,is_published,sort_order');
$lessons = sb('GET', '/lessons?order=sort_order.asc,id.asc&select=id,title,chapter_id,sort_order');
$progress = sb('GET', '/user_progress?select=user_id,lesson_id,status,completed_at');
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$today = $now->setTime(0, 0);
$weekStart = $today->modify('-6 days');
$monthStart = $today->modify('-29 days');
$chapterById = []; foreach ($chapters as $c) $chapterById[(int)$c['id']] = $c;
$lessonById = []; $publishedIds = [];
foreach ($lessons as $l) {
    $chapter = $chapterById[(int)$l['chapter_id']] ?? null;
    $lessonById[(int)$l['id']] = $l + ['chapter_title' => $chapter['title'] ?? 'Unassigned'];
    if ($chapter && !empty($chapter['is_published'])) $publishedIds[(int)$l['id']] = true;
}
$weekly = []; for ($i=0; $i<7; $i++) { $d=$weekStart->modify("+$i days"); $weekly[$d->format('Y-m-d')]=['date'=>$d->format('Y-m-d'),'signups'=>0,'completions'=>0]; }
$newUsers=0; $admins=0; $suspended=0; $seeds=0; $activeToday=[]; $activeMonth=[]; $online=0; $doneCount=0; $publishedDone=0; $per=[]; $activity=[];
foreach ($lessonById as $id=>$l) $per[$id]=0;
foreach ($profiles as $p) {
    $created = new DateTimeImmutable((string)$p['created_at']);
    if ($created >= $weekStart) { $newUsers++; $key=$created->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d'); if(isset($weekly[$key])) $weekly[$key]['signups']++; }
    if (($p['role'] ?? '') === 'admin') $admins++;
    if (!empty($p['is_suspended'])) $suspended++;
    $seeds += (int)($p['seeds'] ?? 0);
    if (!empty($p['last_seen_at']) && new DateTimeImmutable((string)$p['last_seen_at']) >= $now->modify('-90 seconds')) $online++;
    $activity[]=['type'=>'signup','message'=>(string)$p['username'].' joined the garden','created_at'=>(string)$p['created_at']];
}
foreach ($progress as $p) {
    if (($p['status'] ?? '') !== 'done') continue;
    $doneCount++; $lid=(int)$p['lesson_id'];
    if (isset($publishedIds[$lid])) { $per[$lid]++; $publishedDone++; }
    if (empty($p['completed_at'])) continue;
    $finished=new DateTimeImmutable((string)$p['completed_at']); $utc=$finished->setTimezone(new DateTimeZone('UTC'));
    $key=$utc->format('Y-m-d'); if(isset($weekly[$key])) $weekly[$key]['completions']++;
    if($utc >= $today) $activeToday[(string)$p['user_id']]=true;
    if($utc >= $monthStart) $activeMonth[(string)$p['user_id']]=true;
    $profile=null; foreach($profiles as $candidate) if((string)$candidate['id']===(string)$p['user_id']) {$profile=$candidate;break;}
    if($profile && isset($lessonById[$lid])) $activity[]=['type'=>'completion','message'=>(string)$profile['username'].' completed '.(string)$lessonById[$lid]['title'],'created_at'=>(string)$p['completed_at']];
}
$perLesson=[]; foreach($lessonById as $id=>$l) if(isset($publishedIds[$id])) $perLesson[]=['id'=>$id,'title'=>$l['title'],'chapter_id'=>(int)$l['chapter_id'],'chapter_title'=>$l['chapter_title'],'done'=>$per[$id]];
usort($activity, fn($a,$b)=>strcmp($b['created_at'],$a['created_at']));
$publishedCount=count($publishedIds); $denominator=count($profiles)*$publishedCount;
json_out(['users'=>count($profiles),'admins'=>$admins,'suspended'=>$suspended,'new_users_7d'=>$newUsers,'lessons'=>count($lessons),'published_lessons'=>$publishedCount,'completions'=>$doneCount,'seeds_held'=>$seeds,'active_today'=>count($activeToday),'active_30d'=>count($activeMonth),'online_now'=>$online,'completion_rate'=>$denominator?(int)round($publishedDone/$denominator*100):0,'chapters'=>array_values(array_map(fn($c)=>['id'=>(int)$c['id'],'title'=>(string)$c['title']],array_filter($chapters,fn($c)=>!empty($c['is_published'])))),'per_lesson'=>$perLesson,'weekly'=>array_values($weekly),'activity'=>array_slice($activity,0,30)]);
?>
