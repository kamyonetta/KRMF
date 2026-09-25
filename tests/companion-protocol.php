<?php
require __DIR__ . '/../wordpress/krmf-companion/protocol.php';
function expect($ok,$message){if(!$ok)throw new RuntimeException($message);}
function mutation($body,$base=0,$mutation='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee') {
    return ['id'=>'["daily_notes","2026-09-21"]','table'=>'daily_notes','key'=>['2026-09-21'],'base'=>$base,'mutation'=>$mutation,'data'=>$body===null?null:['plan_date'=>'2026-09-21','body'=>$body]];
}
function exchange(&$state,$changes){$request=['protocol'=>1,'changes'=>$changes];krmf_validate_request($request);return krmf_exchange($state,$request);}
$state=['records'=>[],'receipts'=>[]];$a=mutation('original');$first=exchange($state,[$a]);
expect($first['records'][0]['version']===1,'first write');
expect(exchange($state,[$a])['results'][0]===$first['results'][0],'idempotent retry');
$b=mutation('offline',0,'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee');
expect(exchange($state,[$b])['results'][0]['status']==='conflict','concurrent edit must conflict');
$delete=mutation(null,1,'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee');
expect(exchange($state,[$delete])['records'][0]['data']===null,'retained tombstone');
expect(exchange($state,[$a])['results'][0]['record']['version']===1,'retry receipt after later deletion');
expect(count($state['receipts'])===2,'history retained');
$different=$a;$different['data']['body']='tampered';
try{exchange($state,[$different]);throw new RuntimeException('accepted reused mutation');}catch(InvalidArgumentException $e){}
$invalid=$a;$invalid['table']='wp_users';
try{exchange($state,[$invalid]);throw new RuntimeException('accepted forbidden table');}catch(InvalidArgumentException $e){}
$invalid=$a;$invalid['data']['password']='secret';
try{exchange($state,[$invalid]);throw new RuntimeException('accepted forbidden column');}catch(InvalidArgumentException $e){}
$invalid=$a;$invalid['key']=['2026-09-99'];$invalid['id']='["daily_notes","2026-09-99"]';$invalid['data']['plan_date']='2026-09-99';
try{exchange($state,[$invalid]);throw new RuntimeException('accepted impossible date');}catch(InvalidArgumentException $e){}
echo "PASS: PHP protocol writes, retries, conflicts, tombstones, revision history and validation\n";
