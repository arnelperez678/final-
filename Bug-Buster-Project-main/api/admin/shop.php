<?php
declare(strict_types=1);
require __DIR__ . '/../_bootstrap.php';
$method=method_is('GET','POST'); require_admin();
if($method==='GET') json_out(['items'=>sb('GET','/shop_items?order=id.asc&select=id,name,kind,cost_seeds,sprite,is_active')]);
$in=read_json(); $action=(string)($in['action'] ?? 'save');
if($action==='toggle') {
  $id=int_in($in,'id',1,2147483647,0); $active=(bool)($in['is_active'] ?? false);
  $res=sb('PATCH',"/shop_items?id=eq.$id",['is_active'=>$active]); if(!$res) fail('Shop item not found',404); json_out(['ok'=>true]);
}
if($action!=='save') fail('Unknown shop action',422);
$name=trim((string)($in['name'] ?? '')); $kind=(string)($in['kind'] ?? '');
if($name==='' || strlen($name)>80) fail('Item name: 1 to 80 characters',422);
if(!in_array($kind,['seed','tool','decor'],true)) fail('Choose seed, tool, or decor',422);
$row=['name'=>$name,'kind'=>$kind,'cost_seeds'=>int_in($in,'cost_seeds',0,100000,0),'sprite'=>substr(trim((string)($in['sprite'] ?? 'seed')),0,40),'is_active'=>(bool)($in['is_active'] ?? true)];
if(!empty($in['id'])) { $id=int_in($in,'id',1,2147483647,0); $res=sb('PATCH',"/shop_items?id=eq.$id",$row); if(!$res) fail('Shop item not found',404); json_out(['ok'=>true,'item'=>$res[0]]); }
$res=sb('POST','/shop_items',$row); json_out(['ok'=>true,'item'=>$res[0] ?? null],201);
?>
