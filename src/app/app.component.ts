import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CloudEvent, CloudRegistration, TournamentRegistrationService } from './tournament-registration.service';

declare global { interface DOMStringMap { finish?: string; fail?: string; } }

type Mode='league'|'knockout'; type KnockoutView='matches'|'bracket'; type FinishType='spin'|'over'|'burst'|'xtreme';
interface Match{id:number;round:number;a:string|null;b:string|null;sa:number|null;sb:number|null;battleRound?:number} interface Standing{name:string;wins:number;losses:number;scored:number;against:number}
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html',styleUrl:'./app.component.scss'})
export class AppComponent{
 @ViewChild('cameraPreview') cameraPreview?:ElementRef<HTMLVideoElement>;
 title='戰鬥陀螺挑戰賽';count=5;mode:Mode='league';knockoutView:KnockoutView='matches';names:string[]=[];players:string[]=[];matches:Match[]=[];started=false;error='';battleMatch:Match|null=null;battleRound=1;launchFails={a:0,b:0};countdownPlaying=false;recording=false;recordingPaused=false;recordingModeOpen=false;cameraReady=false;recordingUrl='';cameraError='';battleInfoOpen=false;private recordingOverlay?:HTMLElement;private toolbarGuard=document.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('.toolbar-countdown')){event.preventDefault();event.stopImmediatePropagation();this.zone.run(()=>this.recording?this.stopRecording():this.openRecordingMode())}else if(target.closest('.video-pause-btn')){event.preventDefault();event.stopImmediatePropagation();this.zone.run(()=>this.showBattleInfoDialog())}},true);private countdownAudio?:HTMLAudioElement;private cameraStream?:MediaStream;private mediaRecorder?:MediaRecorder;private recordedChunks:Blob[]=[];private readonly storageKey='beybladeTournamentAngularV1';
 constructor(private zone:NgZone,private cdr:ChangeDetectorRef,private cloudRegistration:TournamentRegistrationService){this.cloudRegistration.onAuthChanged(user=>{this.zone.run(()=>{this.staffEmail=user?.isAnonymous?'':user?.email??'';this.staffSignedIn=!!user&&!user.isAnonymous;void this.refreshStaffRole()})});this.resizeNames();this.restore();void this.initializeRegistrationEvent();window.addEventListener('battle-recording-toggle',()=>this.zone.run(()=>this.recording?this.stopRecording():this.openRecordingMode()));window.addEventListener('battle-info-toggle',()=>this.zone.run(()=>this.showBattleInfoDialog()));document.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('.toolbar-countdown')&&this.recording){event.preventDefault();event.stopImmediatePropagation();this.zone.run(()=>this.stopRecording())}if(target.closest('.video-pause-btn')){event.preventDefault();event.stopImmediatePropagation();this.zone.run(()=>this.showBattleInfoDialog())}},true)} newEventTitle='';newEventDate='';newEventLocation='';newEventMode:Mode='league';newCreatedEventLink='';newCreatedEventQrCode='';
 organizerTab:'schedule'|'roster'|'forms'|'history'|'accounts'='schedule';exportBusy=false;
 sitePage:'home'|'events'|'login'|'member'|'admin'|'judge'='home';
 publicEvents:CloudEvent[]=[];publicEventsLoading=false;publicEventsError='';
 calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 memberHistory:{event:CloudEvent;players:string[];wins:number;losses:number;scored:number}[]=[];
 memberHistoryLoading=false;memberHistoryError='';
 get calendarTitle():string{return this.calendarMonth.toLocaleDateString('zh-TW',{year:'numeric',month:'long'})}
 get calendarCells():(number|null)[]{const y=this.calendarMonth.getFullYear(),m=this.calendarMonth.getMonth(),offset=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();return [...Array.from({length:offset},()=>null),...Array.from({length:days},(_,i)=>i+1)]}
 eventStatus(event:CloudEvent):'open'|'closed'|'ended'{
   const today=new Date();
   const localDate=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
   if(event.date && event.date<localDate)return 'ended';
   return event.open?'open':'closed';
 }
 eventStatusLabel(event:CloudEvent):string{
   const status=this.eventStatus(event);
   return status==='open'?'報名中':status==='closed'?'已截止':'已結束';
 }
 eventsOnDay(day:number|null):CloudEvent[]{if(day===null)return [];const date=this.calendarMonth.getFullYear()+'-'+String(this.calendarMonth.getMonth()+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');return this.publicEvents.filter(e=>e.date===date)}
 changeCalendarMonth(offset:number):void{this.calendarMonth=new Date(this.calendarMonth.getFullYear(),this.calendarMonth.getMonth()+offset,1)}
 goSite(page:'home'|'events'|'login'|'member'|'admin'|'judge'):void{location.assign(location.pathname+(page==='home'?'':'#'+page))}
 navigateSite(page:'home'|'events'|'login'|'member'|'admin'|'judge'):void{
   this.sitePage=page;
   if(!this.participantView)history.replaceState(history.state,'',location.pathname+location.search+(page==='home'?'':'#'+page));
   if(page==='home'||page==='events')void this.refreshPublicEvents();
   if(page==='member'&&this.staffSignedIn)void this.refreshMemberHistory();
   this.cdr.detectChanges();
 }
 async refreshPublicEvents():Promise<void>{
   this.publicEventsLoading=true;this.publicEventsError='';
   try{const events=await this.cloudRegistration.listPublicEvents();this.publicEvents=this.staffRole==='judge'?events.filter(e=>this.judgeAssignedEventIds.includes(e.id)):events}
   catch(error){this.publicEventsError='讀取賽事失敗：'+String(error)}
   finally{this.publicEventsLoading=false;this.cdr.detectChanges()}
 }
 async refreshMemberHistory():Promise<void>{
   if(!this.staffSignedIn){this.navigateSite('login');return}
   this.memberHistoryLoading=true;this.memberHistoryError='';
   try{this.memberHistory=await this.cloudRegistration.listMyRegistrationHistory()}
   catch(error){this.memberHistoryError='讀取紀錄失敗：'+String(error)}
   finally{this.memberHistoryLoading=false;this.cdr.detectChanges()}
 }
 openPublicEvent(id:string):void{if(this.staffRole==='judge'&&!this.judgeAssignedEventIds.includes(id))return;location.assign(location.pathname+'?event='+encodeURIComponent(id))}
 authEmail='';authPassword='';authBusy=false;authMessage='';staffEmail='';staffSignedIn=false;staffRole:'admin'|'judge'|'member'|'pending'|'none'='none';staffMembers:{uid:string;email:string;role:string;assignedEventIds:string[]}[]=[];judgeAssignedEventIds:string[]=[];judgeAssignmentBusy=false;judgeAssignmentMessage='';;staffRoleBusy=false;staffView:'login'|'dashboard'|'judge'|'pending'='login';
 get canManageEvents():boolean{return this.staffSignedIn&&this.staffRole==='admin'}
 async refreshStaffRole():Promise<void>{
   try{
     this.staffRole=await this.cloudRegistration.getStaffRole();
     if(this.staffRole==='admin'){this.staffView='dashboard';await this.refreshCloudEvents();await this.refreshStaffMembers()}
     else{this.cloudEvents=[];this.eventOwner=false;this.staffView=this.staffRole==='judge'?'judge':this.staffSignedIn?'pending':'login';this.judgeAssignedEventIds=this.staffRole==='judge'?await this.cloudRegistration.getAssignedJudgeEventIds():[];if(this.staffRole==='judge'&&this.participantView)this.participantTab='matches';if(this.staffRole==='judge'&&(this.sitePage==='home'||this.sitePage==='events'))await this.refreshPublicEvents()}
     if(this.staffSignedIn && (this.sitePage==='login'||this.sitePage==='admin'||this.sitePage==='judge'||(this.staffRole==='judge'&&this.sitePage==='home')))this.sitePage=this.staffRole==='admin'?'admin':this.staffRole==='judge'?'events':'member';
     if(this.staffSignedIn && this.sitePage==='member')void this.refreshMemberHistory();
     this.updateStaffUrl()
   }catch(error){this.authMessage='讀取帳號權限失敗：'+String(error)}
   this.cdr.detectChanges();
 }
 private updateStaffUrl():void{
   if(this.participantView || new URLSearchParams(location.search).has('event'))return;
   if(this.sitePage==='home'||this.sitePage==='events'||this.sitePage==='member')return;
   const hash=this.sitePage==='admin'?'#admin':this.sitePage==='judge'?'#judge':this.sitePage==='login'?'#login':'';
   if(location.hash!==hash)history.replaceState(history.state,'',location.pathname+location.search+hash);
 }
 async loginStaff():Promise<void>{
   if(this.authBusy)return;this.authBusy=true;this.authMessage='';
   try{await this.cloudRegistration.signInStaff(this.authEmail,this.authPassword);await this.cloudRegistration.ensureStaffProfile();await this.refreshStaffRole();this.authPassword='';this.authMessage='登入成功'}
   catch(error){this.authMessage='登入失敗：'+String(error)}
   finally{this.authBusy=false;this.cdr.detectChanges()}
 }
 async signupStaff():Promise<void>{
   if(this.authBusy)return;this.authBusy=true;this.authMessage='';
   try{await this.cloudRegistration.signUpStaff(this.authEmail,this.authPassword);await this.refreshStaffRole();this.authPassword='';this.authMessage='會員帳號已建立，可直接使用會員中心'}
   catch(error){const message=String(error);this.authMessage=message.includes('permission-denied')?'Firebase 已建立或登入帳號，但 Firestore 拒絕建立會員資料。請先部署最新 firestore.rules，然後按「登入」重試；不要重複註冊。':'註冊失敗：'+message}
   finally{this.authBusy=false;this.cdr.detectChanges()}
 }
 async logoutStaff():Promise<void>{
   try{await this.cloudRegistration.signOutStaff();this.staffRole='none';this.staffSignedIn=false;this.cloudEvents=[];this.eventOwner=false;this.authMessage='已登出';this.staffView='login';this.sitePage='login';this.updateStaffUrl()}
   catch(error){this.authMessage='登出失敗：'+String(error)}
   this.cdr.detectChanges();
 }
 async refreshStaffMembers():Promise<void>{
   if(!this.canManageEvents)return;
   try{await this.refreshSavedSchedules();await this.refreshPublicEvents();this.staffMembers=await this.cloudRegistration.listStaff()}
   catch(error){this.authMessage='讀取裁判帳號失敗：'+String(error)}
   this.cdr.detectChanges();
 }
 get assignableJudgeEvents():CloudEvent[]{return this.publicEvents.filter(event=>this.savedScheduleEventIds.includes(event.id))}
 async toggleJudgeAssignment(uid:string,eventId:string):Promise<void>{
   if(!this.canManageEvents||this.judgeAssignmentBusy)return;
   const member=this.staffMembers.find(m=>m.uid===uid);
   if(!member||member.role!=='judge')return;
   const current=member.assignedEventIds??[];
   const next=current.includes(eventId)?current.filter(id=>id!==eventId):[...current,eventId];
   this.judgeAssignmentBusy=true;this.judgeAssignmentMessage='';
   try{await this.cloudRegistration.setJudgeEventAssignments(uid,next);await this.refreshStaffMembers();this.judgeAssignmentMessage='裁判場次指派已更新'}
   catch(error){const message=String(error);this.judgeAssignmentMessage=message.includes('permission-denied')?'指派失敗：Firestore 權限不足。請確認已發布最新版 firestore.rules，並確認目前登入帳號在 staff 文件的角色為 admin。':'指派失敗：'+message;await this.refreshStaffMembers()}
   finally{this.judgeAssignmentBusy=false;this.cdr.detectChanges()}
 }
 async setJudgeRole(uid:string,role:'judge'|'member'):Promise<void>{
   if(!this.canManageEvents||this.staffRoleBusy)return;
   this.staffRoleBusy=true;
   try{await this.cloudRegistration.setStaffRole(uid,role);await this.refreshStaffMembers();this.authMessage='裁判權限已更新'}
   catch(error){this.authMessage='更新裁判權限失敗：'+String(error)}
   finally{this.staffRoleBusy=false;this.cdr.detectChanges()}
 }

 registrationName='';registrationMessage='';registrationOpen=true;registrationReady=false;registrationBusy=false;
 cloudRegistrations:CloudRegistration[]=[];
 eventDate='';eventLocation='';eventId='main';eventLink='';eventQrCode='';eventOwner=false;participantView=false;publicSchedule: {mode:Mode;players:string[];matches:Match[]}|null=null;publicScheduleError='';scheduleSyncState:'idle'|'syncing'|'success'|'error'='idle';private schedulePending=false;private scheduleRunning=false;participantTab:'mine'|'matches'|'ranking'='mine';onlyMyMatches=false;eventBusy=false;cloudEvents:CloudEvent[]=[];eventSelectBusy=false;
 private async initializeRegistrationEvent():Promise<void>{
 await this.cloudRegistration.waitForAuth();
 const id=new URLSearchParams(location.search).get('event');this.participantView=!!id;
 if(id){this.started=false;this.matches=[];this.players=[];}
 if(id){try{await this.cloudRegistration.useEvent(id);const event=await this.cloudRegistration.loadEvent(id);this.eventId=id;this.title=event.title;this.mode=event.mode;this.registrationOpen=event.open;this.eventDate=event.date;this.eventLocation=event.location;this.eventOwner=event.ownerUid===this.cloudRegistration.currentUserId;this.eventLink=location.origin+location.pathname+'?event='+encodeURIComponent(id);await this.updateEventQr()}
 catch(error){this.registrationMessage='賽事載入失敗：'+String(error);return}}
 if(!this.participantView && id)await this.restoreSelectedEventSchedule(id);
 await this.connectRegistrations();
 if(this.participantView){await this.refreshStaffRole();await this.connectPublicSchedule()}
 if(!this.participantView){const page=location.hash.slice(1);this.sitePage=page==='events'||page==='login'||page==='member'||page==='admin'||page==='judge'?page:'home';await this.refreshPublicEvents();if(this.sitePage==='member')await this.refreshMemberHistory();if(this.canManageEvents)await this.refreshCloudEvents()}
 }
 savedScheduleEventIds:string[]=[];savedSchedulesLoading=false;
 async refreshSavedSchedules():Promise<void>{
   this.savedSchedulesLoading=true;
   try{
     await this.refreshCloudEvents();
     const ids=await Promise.all(this.cloudEvents.map(async event=>{
       try{const schedule=await this.cloudRegistration.readSchedule(event.id);return schedule?.matches.length?event.id:null}
       catch{return null}
     }));
     this.savedScheduleEventIds=ids.filter((id):id is string=>id!==null);
   }finally{this.savedSchedulesLoading=false;this.cdr.detectChanges()}
 }
 async refreshCloudEvents():Promise<void>{
   try{this.cloudEvents=await this.cloudRegistration.listOwnedEvents();this.cdr.detectChanges()}
   catch(error){this.registrationMessage='載入賽事清單失敗：'+String(error)}
 }
 private async updateEventQr():Promise<void>{
   this.eventQrCode='';if(!this.eventLink)return;
   try{const QRCodeModule=await import('qrcode');const QRCode=QRCodeModule.default ?? QRCodeModule;this.eventQrCode=await QRCode.toDataURL(this.eventLink,{width:260,margin:2,errorCorrectionLevel:'M'});this.cdr.detectChanges()}
   catch(error){this.registrationMessage='QR Code 產生失敗：'+String(error)}
 }
 async copyEventLink():Promise<void>{try{await navigator.clipboard.writeText(this.eventLink);this.registrationMessage='已複製報名連結'}catch{this.registrationMessage='無法自動複製，請使用瀏覽器網址列複製連結'}}
 private eventScheduleKey(id:string):string{return this.storageKey+':event:'+id}
 private persistCurrentEventSchedule():void{localStorage.setItem(this.eventScheduleKey(this.eventId),JSON.stringify({mode:this.mode,players:this.players,matches:this.matches,started:this.started,knockoutView:this.knockoutView}))}
 private async restoreSelectedEventSchedule(id:string):Promise<void>{
   this.started=false;this.players=[];this.matches=[];this.knockoutView='matches';
   let saved:{mode:Mode;players:string[];matches:Match[];started?:boolean;knockoutView?:KnockoutView}|null=null;
   try{saved=JSON.parse(localStorage.getItem(this.eventScheduleKey(id))||'null')}catch{}
   if(id!=='main'){
     try{const cloud=await this.cloudRegistration.readSchedule(id);
       if(cloud&&cloud.matches.length){this.mode=cloud.mode;this.players=[...cloud.players];this.matches=cloud.matches.map(m=>({...m}));this.count=this.players.length;this.names=[...this.players];return}
     }catch(error){this.registrationMessage='雲端賽程讀取失敗，將嘗試本機紀錄：'+String(error)}
   }
   if(id==='main'&&saved?.matches?.length){this.mode=saved.mode;this.players=[...saved.players];this.matches=saved.matches.map(m=>({...m}));this.count=this.players.length;this.names=[...this.players];this.knockoutView=saved.knockoutView??'matches'}
 }
 async ensureRosterEventSelected():Promise<void>{
   if(this.selectedCloudEventId || this.eventSelectBusy)return;
   if(!this.cloudEvents.length)await this.refreshCloudEvents();
   const first=this.cloudEvents[0];
   if(first)await this.selectCloudEvent(first.id);
 }
 async selectCloudEvent(id:string):Promise<void>{
   if(this.started||this.eventSelectBusy)return;
   this.persistCurrentEventSchedule();
   if(!id){this.eventId='main';await this.restoreSelectedEventSchedule('main');this.eventOwner=false;this.eventLink='';this.eventQrCode='';this.cloudRegistrations=[];this.registrationReady=false;await this.cloudRegistration.useEvent('main');await this.restoreSelectedEventSchedule('main');await this.connectRegistrations();return}
   this.eventSelectBusy=true;
   try{
     const event=await this.cloudRegistration.loadEvent(id);
     await this.cloudRegistration.useEvent(id);
     this.eventId=id;this.title=event.title;this.mode=event.mode;this.registrationOpen=event.open;this.eventDate=event.date;this.eventLocation=event.location;
     this.eventOwner=event.ownerUid===this.cloudRegistration.currentUserId;
     this.eventLink=location.origin+location.pathname+'?event='+encodeURIComponent(id);
     this.cloudRegistrations=[];this.registrationReady=false;this.names=Array.from({length:this.count},()=> '');
     await this.restoreSelectedEventSchedule(id);await this.connectRegistrations();await this.updateEventQr();
     this.registrationMessage='已切換至：'+event.title;
   }catch(error){this.registrationMessage='切換賽事失敗：'+String(error)}
   finally{this.eventSelectBusy=false;this.cdr.detectChanges()}
 }
 get todayLocalDate():string{const now=new Date();return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')}
 get newEventDateExpired():boolean{return !!this.newEventDate && this.newEventDate < this.todayLocalDate}
 async createCloudEvent():Promise<void>{
 if(!this.canManageEvents){this.registrationMessage='只有管理者可以建立賽事';return}if(this.eventBusy)return;const name=this.newEventTitle.trim();if(!name||name.length>80){this.registrationMessage='賽事名稱須為 1 至 80 字';return}if(!/^\d{4}-\d{2}-\d{2}$/.test(this.newEventDate)||!this.newEventLocation.trim()||this.newEventLocation.trim().length>100){this.registrationMessage='請填寫比賽日期與地點（地點最多 100 字）';return}if(this.newEventDateExpired){this.registrationMessage='比賽日期不可早於今天，請選擇今天或未來日期';return}
 this.persistCurrentEventSchedule();this.eventBusy=true;try{const id=await this.cloudRegistration.createEvent(name,this.newEventMode,this.newEventDate,this.newEventLocation.trim());await this.cloudRegistration.useEvent(id);this.eventId=id;this.title=name;this.mode=this.newEventMode;this.eventDate=this.newEventDate;this.eventLocation=this.newEventLocation;this.started=false;this.matches=[];this.players=[];this.eventOwner=true;this.registrationOpen=true;this.registrationReady=false;this.eventLink=location.origin+location.pathname+'?event='+encodeURIComponent(id);this.cloudRegistrations=[];this.names=Array.from({length:this.count},()=> '');await this.connectRegistrations();await this.refreshCloudEvents();await this.updateEventQr();this.newCreatedEventLink=this.eventLink;this.newCreatedEventQrCode=this.eventQrCode;this.newEventTitle='';this.newEventDate='';this.newEventLocation='';this.newEventMode='league';this.registrationMessage='賽事建立成功'}
 catch(error){this.registrationMessage='建立賽事失敗：'+String(error)}finally{this.eventBusy=false;this.cdr.detectChanges()}
 }
 async deleteCloudEvent():Promise<void>{
   if(!this.eventOwner||this.eventId==='main'||this.eventBusy)return;
   if(!window.confirm('確定要刪除「'+this.title+'」？此場次會停止報名並從下拉選單移除，原始資料會保留以防誤刪。'))return;
   this.persistCurrentEventSchedule();this.eventBusy=true;
   try{await this.cloudRegistration.deleteEvent(this.eventId);await this.cloudRegistration.useEvent('main');this.eventId='main';this.eventOwner=false;this.eventLink='';this.eventQrCode='';this.cloudRegistrations=[];this.registrationReady=false;this.eventDate='';this.eventLocation='';await this.connectRegistrations();await this.refreshCloudEvents();this.registrationMessage='賽事已刪除並停止報名'}
   catch(error){this.registrationMessage='刪除失敗：'+String(error)}finally{this.eventBusy=false;this.cdr.detectChanges()}
 }
 async cancelListedEvent(event:CloudEvent):Promise<void>{
   if(!this.canManageEvents||this.eventBusy||this.eventSelectBusy)return;
   if(!window.confirm('確定取消「'+event.title+'」？此賽事會停止報名並從公開清單移除，原始報名資料會保留。'))return;
   this.eventBusy=true;
   try{
     await this.cloudRegistration.deleteEvent(event.id);
     if(this.eventId===event.id){
       this.persistCurrentEventSchedule();
       await this.cloudRegistration.useEvent('main');
       this.eventId='main';this.eventOwner=false;this.eventLink='';this.eventQrCode='';
       this.cloudRegistrations=[];this.registrationReady=false;this.eventDate='';this.eventLocation='';
       await this.restoreSelectedEventSchedule('main');await this.connectRegistrations();
     }
     await this.refreshCloudEvents();
     this.registrationMessage='已取消賽事：'+event.title+'（報名資料保留）';
   }catch(error){this.registrationMessage='取消賽事失敗：'+String(error)}
   finally{this.eventBusy=false;this.cdr.detectChanges()}
 }
 async toggleCloudRegistration():Promise<void>{if(!this.eventOwner)return;try{await this.cloudRegistration.setRegistrationOpen(!this.registrationOpen);this.registrationOpen=!this.registrationOpen}catch(error){this.registrationMessage='更新報名狀態失敗：'+String(error)}}

 get selectedCloudEventId():string{return this.cloudEvents.some(event=>event.id===this.eventId)?this.eventId:''}
 judgeLocks:Record<string,{uid:string;expiresAt:number}>={};judgeMatchId:number|null=null;judgeMatchBusy=false;judgeScoreMessage='';private judgeLocksUnsubscribe?:()=>void;
 get judgeActiveMatch():Match|null{return this.publicMatches.find(m=>m.id===this.judgeMatchId)??null}
 judgeLockedByOther(id:number):boolean{const lock=this.judgeLocks[String(id)];return !!lock&&lock.expiresAt>Date.now()&&lock.uid!==this.cloudRegistration.currentUserId}
 judgeOwnsLock(id:number):boolean{const lock=this.judgeLocks[String(id)];return !!lock&&lock.expiresAt>Date.now()&&lock.uid===this.cloudRegistration.currentUserId}
 async beginJudgeMatch(m:Match):Promise<void>{
   if(this.staffRole!=='judge'||!this.judgeAssignedEventIds.includes(this.eventId)||!m.a||!m.b||this.judgeMatchBusy)return;
   this.judgeMatchBusy=true;this.judgeScoreMessage='';
   try{await this.cloudRegistration.claimJudgeMatch(this.eventId,m.id);this.judgeMatchId=m.id;this.battleMatch={...m,sa:m.sa??0,sb:m.sb??0};this.battleRound=m.battleRound??1;this.resetLaunchFails();this.judgeScoreMessage='已鎖定場次，只有你可以計分'}
   catch(error){this.judgeScoreMessage='無法進入對戰：'+String(error)}
   finally{this.judgeMatchBusy=false;this.cdr.detectChanges()}
 }
 async updateJudgeScore(side:'a'|'b',points:number):Promise<void>{
   if(this.staffRole!=='judge'||this.judgeMatchId===null||this.judgeMatchBusy)return;
   this.judgeMatchBusy=true;
   try{await this.cloudRegistration.scoreJudgeMatch(this.eventId,this.judgeMatchId,side,points);this.judgeScoreMessage='比分已同步至 Firebase'}
   catch(error){this.judgeScoreMessage='計分失敗：'+String(error)}
   finally{this.judgeMatchBusy=false;this.cdr.detectChanges()}
 }
 get judgeNextBattleMatch():Match|null{if(this.judgeMatchId===null)return null;const i=this.publicMatches.findIndex(m=>m.id===this.judgeMatchId);return this.publicMatches.slice(i+1).find(m=>!!m.a&&!!m.b&&!this.judgeLockedByOther(m.id))??null}
 async judgeGoNextBattle():Promise<void>{
   if(this.judgeMatchId===null||this.judgeMatchBusy)return;
   if(!this.battleFinished){this.showNextBattleNotice();return}
   const next=this.judgeNextBattleMatch;if(!next)return;
   this.judgeMatchBusy=true;
   try{await this.cloudRegistration.claimJudgeMatch(this.eventId,next.id);await this.cloudRegistration.releaseJudgeMatch(this.eventId,this.judgeMatchId);this.judgeMatchId=next.id;this.battleMatch={...next,sa:next.sa??0,sb:next.sb??0};this.battleRound=next.battleRound??1;this.resetLaunchFails();this.judgeScoreMessage='已切換至下一場'}
   catch(error){this.judgeScoreMessage='切換下一場失敗：'+String(error)}
   finally{this.judgeMatchBusy=false;this.cdr.detectChanges()}
 }
 async judgeLaunchFail(side:'a'|'b'):Promise<void>{
   if(this.judgeMatchId===null||this.judgeMatchBusy||this.battleFinished)return;
   this.launchFails[side]=Math.min(2,this.launchFails[side]+1);
   this.stopRecording();
   if(this.launchFails[side]===2){const opponent=side==='a'?'b':'a';await this.updateJudgeScore(opponent,1);this.resetLaunchFails()}
   this.cdr.detectChanges();
 }
 async judgeDrawBattle():Promise<void>{this.stopRecording()}
 async judgeBattleScore(side:'a'|'b',points:number):Promise<void>{
   await this.updateJudgeScore(side,points);
   if(!this.judgeScoreMessage.startsWith('計分失敗')){if(!this.battleFinished)this.battleRound++;this.resetLaunchFails()}
 }
 async resetJudgeBattle():Promise<void>{
   if(this.judgeMatchId===null||this.judgeMatchBusy)return;
   if(!confirm('確定重新計分？這場比賽的雙方比分會歸零並同步至所有裝置。'))return;
   this.judgeMatchBusy=true;
   try{await this.cloudRegistration.scoreJudgeMatch(this.eventId,this.judgeMatchId,'a',0,true);this.battleRound=1;this.resetLaunchFails();this.judgeScoreMessage='已重新計分'}
   catch(error){this.judgeScoreMessage='重新計分失敗：'+String(error)}
   finally{this.judgeMatchBusy=false;this.cdr.detectChanges()}
 }
 async endJudgeMatch():Promise<void>{
   if(this.judgeMatchId===null)return;const id=this.judgeMatchId;this.judgeMatchBusy=true;
   try{await this.cloudRegistration.releaseJudgeMatch(this.eventId,id);this.judgeMatchId=null;this.battleMatch=null;this.judgeScoreMessage='已釋放場次，其他裁判可以接手'}
   catch(error){this.judgeScoreMessage='解除鎖定失敗：'+String(error)}
   finally{this.judgeMatchBusy=false;this.cdr.detectChanges()}
 }
 private async connectPublicSchedule():Promise<void>{
   if(this.staffRole==='judge' && this.judgeAssignedEventIds.includes(this.eventId)){
     this.judgeLocksUnsubscribe?.();this.judgeLocksUnsubscribe=this.cloudRegistration.watchJudgeLocks(this.eventId,locks=>{this.judgeLocks=locks;this.cdr.detectChanges()});
   }
   await this.cloudRegistration.watchSchedule(data=>{this.publicSchedule=data;if(this.staffRole==='judge'&&this.judgeMatchId!==null&&this.battleMatch){const current=data?.matches.find(m=>m.id===this.judgeMatchId);if(current){this.battleMatch={...current,sa:current.sa??0,sb:current.sb??0}}}this.publicScheduleError='';this.cdr.detectChanges()},error=>{this.publicScheduleError='賽程同步失敗：'+error;this.cdr.detectChanges()});
 }
 get publicMatches():Match[]{return this.publicSchedule?.matches??[]}
 get visiblePublicMatches():Match[]{if(!this.onlyMyMatches)return this.publicMatches;const names=new Set(this.myRegistrations.map(r=>r.name.trim()));return this.publicMatches.filter(m=>(!!m.a&&names.has(m.a.trim()))||(!!m.b&&names.has(m.b.trim())))}
 get myScheduledMatchCount():number{return this.publicMatches.filter(m=>this.myRegistrations.some(r=>r.name.trim()===m.a?.trim()||r.name.trim()===m.b?.trim())).length}
 get publicRounds():number[]{const matches=this.publicMatches;const max=Math.max(0,...matches.map(m=>Number(m.round)||0));return Array.from({length:max},(_,i)=>i+1)}
 publicRoundMatches(round:number):Match[]{return this.publicMatches.filter(m=>m.round===round)}
 publicMatchWinner(m:Match):string|null{if(!m.a)return m.b;if(!m.b)return m.a;const a=m.sa??0,b=m.sb??0;return Math.max(a,b)>=4&&a!==b?(a>b?m.a:m.b):null}
 get publicStandings():Standing[]{
   const table=new Map<string,Standing>();for(const name of this.publicSchedule?.players??[])table.set(name,{name,wins:0,losses:0,scored:0,against:0});
   for(const m of this.publicMatches){if(!m.a||!m.b||Math.max(m.sa??0,m.sb??0)<4)continue;const a=table.get(m.a),b=table.get(m.b);if(!a||!b)continue;a.scored+=m.sa??0;a.against+=m.sb??0;b.scored+=m.sb??0;b.against+=m.sa??0;if((m.sa??0)>(m.sb??0)){a.wins++;b.losses++}else if((m.sb??0)>(m.sa??0)){b.wins++;a.losses++}}
   return [...table.values()].sort((a,b)=>b.wins-a.wins||((b.scored-b.against)-(a.scored-a.against))||b.scored-a.scored);
 }
 publishCurrentSchedule():void{
   if(!this.started||!this.eventOwner||this.eventId==='main'){this.registrationMessage='請先選擇自己建立的雲端賽事並產生賽程';return}
   this.publishPublicSchedule();
 }
 private publishPublicSchedule():void{
   if(this.participantView||!this.eventOwner||this.eventId==='main'||!this.started)return;
   this.schedulePending=true;
   this.scheduleSyncState='syncing';
   this.cdr.detectChanges();
   if(!this.scheduleRunning)void this.flushPublicSchedule();
 }
 private async flushPublicSchedule():Promise<void>{
   this.scheduleRunning=true;
   while(this.schedulePending){
     this.schedulePending=false;
     const eventId=this.eventId;
     const payload={mode:this.mode,players:[...this.players],matches:this.matches.map(m=>({...m}))};
     try{
       await this.cloudRegistration.publishSchedule(payload);
       if(this.eventId!==eventId)break;
       if(!this.schedulePending){this.scheduleSyncState='success';this.registrationMessage='☁️ 賽程與比分已成功同步至 Firebase'}
     }catch(error){
       if(this.eventId!==eventId)break;
       this.scheduleSyncState='error';
       const code=(error as {code?:string})?.code;
       this.registrationMessage=code==='permission-denied'
         ?'賽程同步遭 Firebase 拒絕：請確認 Firestore 規則已發布，且目前是建立賽事的匿名帳號。'
         :'賽程同步失敗：'+String(error);
       this.schedulePending=false;
     }
     this.cdr.detectChanges();
   }
   this.scheduleRunning=false;
 }

 async exportRegistrationImage():Promise<void>{
   if(this.exportBusy||!this.registeredNames.length)return;
   this.exportBusy=true;
   try{
     const names=[...this.registeredNames];
     const width=1080,columns=names.length>10?3:2,rows=Math.ceil(names.length/columns);
     const header=310,rowHeight=78,height=Math.max(650,header+rows*rowHeight+120);
     const canvas=document.createElement('canvas');
     canvas.width=width;canvas.height=height;
     const ctx=canvas.getContext('2d');
     if(!ctx)throw new Error('瀏覽器無法建立圖片畫布');
     ctx.fillStyle='#17191c';ctx.fillRect(0,0,width,height);
     const top=ctx.createLinearGradient(0,0,width,240);top.addColorStop(0,'#252a2b');top.addColorStop(1,'#17191c');
     ctx.fillStyle=top;ctx.fillRect(0,0,width,230);
     ctx.fillStyle='#c7fb3b';ctx.font='bold 38px sans-serif';ctx.fillText('BEYBLADE X',54,74);
     ctx.fillStyle='#ffffff';ctx.font='bold 48px sans-serif';ctx.fillText('參賽者報名成功名單',54,142);
     const fit=(value:string,maxWidth:number,size:number,min=19):void=>{
       let fontSize=size;ctx.font='bold '+fontSize+'px sans-serif';
       while(ctx.measureText(value).width>maxWidth&&fontSize>min){fontSize--;ctx.font='bold '+fontSize+'px sans-serif'}
     };
     fit(this.title,width-110,31);
     ctx.fillStyle='#f3f6f2';ctx.fillText(this.title,54,197);
     ctx.fillStyle='#aab8b4';ctx.font='26px sans-serif';
     ctx.fillText('日期：'+(this.eventDate||'待公布')+'     地點：'+(this.eventLocation||'待公布'),54,272);
     ctx.fillStyle='#f3f6f2';ctx.font='bold 28px sans-serif';ctx.fillText('報名成功  '+names.length+' 人',54,324);
     const colWidth=(width-100)/columns;
     names.forEach((name,i)=>{
       const col=i%columns,row=Math.floor(i/columns),x=50+col*colWidth,y=354+row*rowHeight;
       ctx.fillStyle=row%2===0?'#252b2b':'#1e2324';
       ctx.beginPath();ctx.roundRect(x,y,colWidth-12,65,12);ctx.fill();
       ctx.fillStyle='#c7fb3b';ctx.font='bold 24px sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),x+18,y+42);
       fit(name,colWidth-105,29,17);
       ctx.fillStyle='#ffffff';ctx.fillText(name,x+64,y+42);
     });
     ctx.fillStyle='#aab8b4';ctx.font='22px sans-serif';ctx.fillText('BEYBLADE X  •  Firebase 報名名單',54,height-38);
     const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('圖片輸出失敗')),'image/png'));
     const url=URL.createObjectURL(blob),link=document.createElement('a');
     const safeName=(this.title||'比賽').replace(/[\\/:*?"<>|]/g,'_').slice(0,60);
     link.href=url;link.download=safeName+'-報名成功名單.png';document.body.appendChild(link);link.click();link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),10000);
   }catch(error){this.registrationMessage='匯出圖片失敗：'+String(error)}
   finally{this.exportBusy=false;this.cdr.detectChanges()}
 }
 editingRegistrationId:string|null=null;
 editingRegistrationName='';
 registrationEditBusy=false;
 beginRegistrationEdit(entry:CloudRegistration):void{if(!this.canManageEvents||this.registrationEditBusy)return;this.editingRegistrationId=entry.uid;this.editingRegistrationName=entry.name}
 cancelRegistrationEdit():void{this.editingRegistrationId=null;this.editingRegistrationName=''}
 async saveRegistrationEdit(entry:CloudRegistration):Promise<void>{
   if(!this.canManageEvents||this.registrationEditBusy||this.editingRegistrationId!==entry.uid)return;
   const name=this.editingRegistrationName.trim().replace(/\s+/g,' ');
   if(!name||name.length>30){this.registrationMessage='姓名須為 1 至 30 字';return}
   if(this.cloudRegistrations.some(item=>item.uid!==entry.uid&&item.name.toLocaleLowerCase()===name.toLocaleLowerCase())){this.registrationMessage='此姓名已報名';return}
   if(name===entry.name){this.cancelRegistrationEdit();return}
   this.registrationEditBusy=true;
   try{await this.cloudRegistration.renameRegistration(entry.uid,name);this.cancelRegistrationEdit();this.registrationMessage='已更新選手姓名：'+name}
   catch(error){this.registrationMessage='修改失敗：'+String(error)}
   finally{this.registrationEditBusy=false;this.cdr.detectChanges()}
 }
 async removeRegistration(entry:CloudRegistration):Promise<void>{
   if(!this.canManageEvents||this.registrationEditBusy)return;
   if(!confirm('確定刪除「'+entry.name+'」的報名紀錄？此操作無法復原。'))return;
   this.registrationEditBusy=true;
   try{await this.cloudRegistration.deleteRegistration(entry.uid);if(this.editingRegistrationId===entry.uid)this.cancelRegistrationEdit();this.registrationMessage='已刪除報名：'+entry.name}
   catch(error){this.registrationMessage='刪除失敗：'+String(error)}
   finally{this.registrationEditBusy=false;this.cdr.detectChanges()}
 }
 get registeredNames():string[]{return this.cloudRegistrations.map(item=>item.name)}
 get myRegistrations():CloudRegistration[]{const uid=this.cloudRegistration.currentUserId;return uid?this.cloudRegistrations.filter(item=>item.ownerUid===uid):[]}
 setParticipantTab(tab:'mine'|'matches'|'ranking'):void{if(this.staffRole==='judge'&&tab==='mine')return;this.participantTab=tab}
 private async connectRegistrations():Promise<void>{
   await this.cloudRegistration.connect(names=>{
     this.cloudRegistrations=names;this.registrationReady=true;
     this.cdr.detectChanges();
   },message=>{this.registrationReady=false;this.registrationMessage='雲端連線失敗：'+message;this.cdr.detectChanges()});
 }
 async registerPlayer():Promise<void>{
   if(this.staffRole==='judge'){this.registrationMessage='裁判帳號不可報名';return}
   if(this.registrationBusy)return;
   const name=this.registrationName.trim().replace(/\s+/g,' ');
   if(!this.registrationReady){this.registrationMessage='正在連線 Firebase，請稍後再試';return}
   if(!this.registrationOpen||this.started){this.registrationMessage='本機報名畫面已關閉';return}
   if(!name||name.length>30){this.registrationMessage='請輸入 1 至 30 字的姓名';return}
   if(this.registeredNames.some(n=>n.toLocaleLowerCase()===name.toLocaleLowerCase())){this.registrationMessage='此姓名已報名';return}
   if(this.registeredNames.length>=64){this.registrationMessage='報名已達 64 人上限';return}
   this.registrationBusy=true;
   try{
     await this.cloudRegistration.register(name);
     this.registrationName='';this.registrationMessage='雲端報名成功：'+name;
   }catch(error){this.registrationMessage='報名失敗：'+(error instanceof Error?error.message:String(error))}
   finally{this.registrationBusy=false;this.cdr.detectChanges()}
 }
 importRegistrations(){
   if(this.started)return;
   const names=this.registeredNames;
   if(names.length<2){this.registrationMessage='至少需要 2 位參賽者才能建立賽事';return}
   this.count=names.length;this.resizeNames();this.names=[...names];
   this.registrationMessage='已匯入 '+names.length+' 位選手，請確認後產生對戰組合';
 }
 resizeNames(){const n=Math.max(2,Math.min(64,Number(this.count)||2));this.count=n;this.names=Array.from({length:n},(_,i)=>this.names[i]??'')} trackByIndex(index:number){return index} setMode(mode:Mode){this.mode=mode} setKnockoutView(view:KnockoutView){this.knockoutView=view} demo(){const d=['小明','小華','阿哲','小宇','小凱','小杰','小安','小翔'];this.names=this.names.map((_,i)=>d[i]??`選手${i+1}`)}
 private shuffle<T>(items:T[]):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a} start(){if(this.matches.length){this.resumeSchedule();return}const p=this.names.map(x=>x.trim());if(p.some(x=>!x)){this.error='請輸入所有選手名稱';return}if(new Set(p).size!==p.length){this.error='選手名稱不可重複';return}this.error='';this.players=this.shuffle(p);this.matches=[];this.knockoutView='matches';this.mode==='league'?this.makeLeague():this.makeKnockout();this.started=true;this.save()}
 private makeLeague(){let id=0;const pool:Match[]=[];for(let i=0;i<this.players.length;i++)for(let j=i+1;j<this.players.length;j++)pool.push({id:id++,round:1,a:this.players[i],b:this.players[j],sa:null,sb:null,battleRound:1});this.matches=this.buildRestFriendlySchedule(pool).map((m,i)=>({...m,id:i}))} private buildRestFriendlySchedule(source:Match[]):Match[]{const remaining=this.shuffle(source),result:Match[]=[],lastPlayed=new Map<string,number>();while(remaining.length){const currentIndex=result.length;let bestGap=-1,candidates:number[]=[];for(let i=0;i<remaining.length;i++){const m=remaining[i],aLast=m.a?lastPlayed.get(m.a):-Infinity,bLast=m.b?lastPlayed.get(m.b):-Infinity,aGap=aLast===undefined?Infinity:currentIndex-aLast-1,bGap=bLast===undefined?Infinity:currentIndex-bLast-1,gap=Math.min(aGap,bGap);if(gap>bestGap){bestGap=gap;candidates=[i]}else if(gap===bestGap)candidates.push(i)}const pick=candidates[Math.floor(Math.random()*candidates.length)],[m]=remaining.splice(pick,1);result.push(m);if(m.a)lastPlayed.set(m.a,currentIndex);if(m.b)lastPlayed.set(m.b,currentIndex)}return result}
 private makeKnockout(){const size=this.nextPow2(this.players.length),seeded:(string|null)[]=[...this.players];while(seeded.length<size)seeded.push(null);const draw=this.shuffle(seeded);for(let i=0;i<size;i+=2)this.matches.push({id:this.matches.length,round:1,a:draw[i],b:draw[i+1],sa:null,sb:null,battleRound:1});this.buildNextRounds()} private nextPow2(n:number){let x=1;while(x<n)x*=2;return x}
 openBattle(m:Match){if(!m.a||!m.b)return;if(m.sa===null)m.sa=0;if(m.sb===null)m.sb=0;this.battleMatch=m;this.battleRound=m.battleRound??1;this.resetLaunchFails();this.cameraError='';this.matches=[...this.matches];this.save()} closeBattle(){this.countdownAudio?.pause();this.countdownPlaying=false;this.stopRecording();this.stopCamera();if(this.battleMatch){this.battleMatch.battleRound=this.battleRound;this.save()}this.battleMatch=null;this.resetLaunchFails()} battlePoints(side:'a'|'b'){if(!this.battleMatch)return 0;return side==='a'?(this.battleMatch.sa??0):(this.battleMatch.sb??0)} get battleFinished(){return!!this.battleMatch&&((this.battleMatch.sa??0)>=4||(this.battleMatch.sb??0)>=4)}
 get nextBattleMatch():Match|null{if(!this.battleMatch)return null;const current=this.matches.indexOf(this.battleMatch);for(let i=current+1;i<this.matches.length;i++){const m=this.matches[i];if(m.a&&m.b)return m}return null}
 goNextBattle(){if(!this.battleFinished){this.showNextBattleNotice();return}const next=this.nextBattleMatch;if(!next)return;this.countdownAudio?.pause();this.countdownPlaying=false;this.stopRecording();if(this.battleMatch)this.battleMatch.battleRound=this.battleRound;this.resetLaunchFails();this.openBattle(next);queueMicrotask(()=>this.cdr.detectChanges())}
 private showNextBattleNotice(){const dialog=document.createElement('dialog');dialog.style.cssText='border:0;border-radius:14px;padding:26px 24px;text-align:center;background:#fff;color:#17212b;box-shadow:0 18px 50px #0008;max-width:360px;width:calc(90vw - 48px)';const title=document.createElement('h3');title.textContent='無法進入下一場';title.style.cssText='margin:0 0 10px;color:#17212b';const message=document.createElement('p');message.textContent='目前場次比分未達 4 分，\n無法進入下一場比賽';message.style.cssText='margin:0 0 20px;line-height:1.6;white-space:pre-line';const button=document.createElement('button');button.textContent='確定';button.style.cssText='border:0;border-radius:11px;padding:12px 24px;font-weight:700;cursor:pointer;background:#1e8cff;color:#fff';button.onclick=()=>dialog.close();dialog.append(title,message,button);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal()}
 private async ensureCamera(){if(this.cameraStream)return true;if(!navigator.mediaDevices?.getUserMedia){this.cameraError='此瀏覽器不支援網頁相機錄影';return false}try{this.cameraError='';this.cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:true});this.cameraReady=true;setTimeout(()=>{const video=this.cameraPreview?.nativeElement;if(video&&this.cameraStream){video.srcObject=this.cameraStream;video.play().catch(()=>{})}},0);return true}catch(e){console.error(e);this.cameraError='無法開啟相機／麥克風，請確認瀏覽器權限';return false}}
 private async startRecording(){if(this.recording)return true;if(!(await this.ensureCamera())||!this.cameraStream)return false;if(typeof MediaRecorder==='undefined'){this.cameraError='此瀏覽器不支援網頁錄影';return false}try{if(this.recordingUrl){URL.revokeObjectURL(this.recordingUrl);this.recordingUrl=''}this.removeRecordingReplay();this.recordedChunks=[];const types=['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm'],mimeType=types.find(t=>MediaRecorder.isTypeSupported(t));this.mediaRecorder=mimeType?new MediaRecorder(this.cameraStream,{mimeType}):new MediaRecorder(this.cameraStream);this.mediaRecorder.ondataavailable=e=>{if(e.data.size)this.recordedChunks.push(e.data)};this.mediaRecorder.onstop=()=>this.zone.run(()=>{if(!this.recordedChunks.length)return;const type=this.mediaRecorder?.mimeType||this.recordedChunks[0].type||'video/webm';this.recordingUrl=URL.createObjectURL(new Blob(this.recordedChunks,{type}));this.renderRecordingReplay();this.cdr.detectChanges()});this.mediaRecorder.start(250);this.recording=true;return true}catch(e){console.error(e);this.cameraError='錄影啟動失敗';return false}}
 stopRecording(){this.countdownAudio?.pause();this.countdownPlaying=false;if(this.mediaRecorder&&this.mediaRecorder.state!=='inactive'){try{this.mediaRecorder.requestData()}catch{}this.mediaRecorder.stop()}this.recording=false;this.recordingPaused=false;this.setToolbarLabel('📹 錄影模式');this.cdr.detectChanges()} toggleRecordingPause(){if(!this.recording||!this.mediaRecorder)return;if(this.mediaRecorder.state==='recording'){this.mediaRecorder.pause();this.recordingPaused=true;this.cameraPreview?.nativeElement.pause();this.setToolbarLabel('▶ 繼續錄影')}else if(this.mediaRecorder.state==='paused'){this.mediaRecorder.resume();this.recordingPaused=false;this.cameraPreview?.nativeElement.play().catch(()=>{});this.setToolbarLabel('⏸ 暫停')}this.refreshRecordingScoreboard();this.cdr.detectChanges()} private setToolbarLabel(label:string){const button=document.querySelector<HTMLElement>('.toolbar-countdown');if(button)button.textContent=label;const recordingButton=document.querySelector<HTMLElement>('.recording-go-btn');if(recordingButton)recordingButton.textContent=label==='📹 錄影模式'?'3・2・1 GO SHOOT!':label==='🔊 GO SHOOT!'?'⏸ 暫停':label} openBattleInfo(){this.battleInfoOpen=true} closeBattleInfo(){this.battleInfoOpen=false} private stopCamera(){this.cameraStream?.getTracks().forEach(t=>t.stop());this.cameraStream=undefined;this.cameraReady=false}
 private removeRecordingReplay(){this.recordingOverlay?.querySelector('.recording-replay')?.remove()}
 private renderRecordingReplay(){if(!this.recordingOverlay||!this.recordingUrl||this.recording)return;this.removeRecordingReplay();const panel=document.createElement('div');panel.className='recording-replay';const title=document.createElement('strong');title.textContent='🎬 本局影像確認';const video=document.createElement('video');video.className='recording-replay-video';video.src=this.recordingUrl;video.controls=true;video.playsInline=true;video.preload='metadata';const actions=document.createElement('div');actions.className='recording-replay-actions';const hint=document.createElement('span');hint.textContent='可重新播放確認是否犯規／需要重賽';const save=document.createElement('button');save.type='button';save.textContent='💾 儲存影片';save.addEventListener('click',()=>this.downloadRecording());actions.append(hint,save);panel.append(title,video,actions);this.recordingOverlay.appendChild(panel)}
 async downloadRecording(){if(!this.recordingUrl)return;const mimeType=this.mediaRecorder?.mimeType||'video/webm',extension=mimeType.includes('mp4')?'mp4':'webm',filename=`beyblade-R${this.battleRound}-${Date.now()}.${extension}`;if(typeof navigator.share==='function'){try{const response=await fetch(this.recordingUrl);const blob=await response.blob();const file=new File([blob],filename,{type:blob.type||mimeType});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Beyblade 比賽錄影'});return}}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return}}const a=document.createElement('a');a.href=this.recordingUrl;a.download=filename;a.click()}
 async playCountdown(){if(this.recording){this.stopRecording();return}if(this.countdownPlaying||this.battleFinished)return;await this.startRecording();try{this.countdownPlaying=true;this.setToolbarLabel('🔊 GO SHOOT!');if(!this.countdownAudio){const response=await fetch('assets/audio/321-go-shoot.mp3.b64');if(!response.ok)throw new Error('countdown audio not found');const base64=(await response.text()).trim(),binary=atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);const url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));this.countdownAudio=new Audio(url);this.countdownAudio.preload='auto';this.countdownAudio.onended=()=>this.zone.run(()=>{this.countdownPlaying=false;this.setToolbarLabel('⏸ 暫停');this.cdr.detectChanges()});this.countdownAudio.onerror=()=>this.zone.run(()=>{this.countdownPlaying=false;this.setToolbarLabel('⏸ 暫停');this.cdr.detectChanges()})}this.countdownAudio.currentTime=0;await this.countdownAudio.play()}catch(e){console.error(e);this.countdownPlaying=false;this.setToolbarLabel('⏸ 暫停')}}
 addBattleScore(side:'a'|'b',type:FinishType){if(!this.battleMatch||this.battleFinished)return;if(this.battleMatch.sa===null)this.battleMatch.sa=0;if(this.battleMatch.sb===null)this.battleMatch.sb=0;const add=this.finishPoints(type);if(side==='a')this.battleMatch.sa+=add;else this.battleMatch.sb+=add;this.stopRecording();const finished=this.battleFinished;if(!finished)this.battleRound++;this.battleMatch.battleRound=this.battleRound;this.resetLaunchFails();this.updateScore(this.battleMatch)}
 launchFail(side:'a'|'b'){
  if(!this.battleMatch||this.battleFinished)return;
  if(this.battleMatch.sa===null)this.battleMatch.sa=0;
  if(this.battleMatch.sb===null)this.battleMatch.sb=0;
  this.launchFails[side]=Math.min(2,this.launchFails[side]+1);
  this.stopRecording();
  if(this.launchFails[side]===1){this.updateScore(this.battleMatch);return}
  const opponent:'a'|'b'=side==='a'?'b':'a';if(opponent==='a')this.battleMatch.sa+=1;else this.battleMatch.sb+=1;const finished=this.battleFinished;if(!finished)this.battleRound++;this.battleMatch.battleRound=this.battleRound;this.resetLaunchFails();this.updateScore(this.battleMatch)
 }
 drawBattle(){if(this.battleFinished)return;this.stopRecording()} private resetLaunchFails(){this.launchFails={a:0,b:0}} private finishPoints(type:FinishType){return type==='spin'?1:type==='xtreme'?3:2} resetBattle(){if(!this.battleMatch)return;this.stopRecording();this.battleMatch.sa=null;this.battleMatch.sb=null;this.battleRound=1;this.battleMatch.battleRound=1;this.resetLaunchFails();this.updateScore(this.battleMatch)}
 winner(m:Match):string|null|undefined{if(!m.a)return m.b;if(!m.b)return m.a;const sa=m.sa??0,sb=m.sb??0;if(Math.max(sa,sb)<4||sa===sb)return undefined;return sa>sb?m.a:m.b} isWinner(m:Match,player:string|null){return!!player&&this.winner(m)===player} hasWinner(m:Match){return this.winner(m)!==undefined&&this.winner(m)!==null} updateScore(m:Match){m.sa=m.sa===null?null:Math.max(0,Number(m.sa));m.sb=m.sb===null?null:Math.max(0,Number(m.sb));m.battleRound=this.battleRound;if(this.mode==='knockout'){this.matches=this.matches.filter(x=>x.round<=m.round);this.buildNextRounds()}else{this.matches=[...this.matches]}this.save();queueMicrotask(()=>this.cdr.detectChanges())}
 private buildNextRounds(){const total=Math.log2(this.nextPow2(this.players.length));for(let r=1;r<total;r++){const prev=this.matches.filter(m=>m.round===r);if(!prev.length||!prev.every(m=>this.winner(m)!==undefined))break;if(this.matches.some(m=>m.round===r+1))continue;for(let i=0;i<prev.length;i+=2)this.matches.push({id:this.matches.length,round:r+1,a:this.winner(prev[i])??null,b:this.winner(prev[i+1])??null,sa:null,sb:null,battleRound:1})}}

 get standings(): Standing[] {
   const table = new Map<string, Standing>();
   for (const name of this.players) {
     table.set(name, { name, wins: 0, losses: 0, scored: 0, against: 0 });
   }
   for (const match of this.matches) {
     if (!match.a || !match.b) continue;
     const sa = match.sa ?? 0;
     const sb = match.sb ?? 0;
     if (Math.max(sa, sb) < 4) continue;
     const a = table.get(match.a);
     const b = table.get(match.b);
     if (!a || !b) continue;
     a.scored += sa;
     a.against += sb;
     b.scored += sb;
     b.against += sa;
     if (sa > sb) { a.wins++; b.losses++; }
     else if (sb > sa) { b.wins++; a.losses++; }
   }
   return [...table.values()].sort((a, b) =>
     b.wins - a.wins ||
     (b.scored - b.against) - (a.scored - a.against) ||
     b.scored - a.scored
   );
 }
 get rounds(){return Array.from({length:this.finalRound},(_,i)=>i+1)} roundMatches(r:number){return this.matches.filter(m=>m.round===r)} bracketSlotCount(r:number){return this.nextPow2(this.players.length)/Math.pow(2,r)} bracketMatches(r:number){const existing=this.roundMatches(r);return Array.from({length:this.bracketSlotCount(r)},(_,i)=>existing[i]??({id:-(r*100+i),round:r,a:null,b:null,sa:null,sb:null,battleRound:1} as Match))} expectedLabel(r:number,index:number,side:'a'|'b'){if(r===1)return'輪空';const prevIndex=index*2+(side==='b'?1:0);return`第 ${r-1} 輪第 ${prevIndex+1} 場勝者`} get finalRound(){return Math.log2(this.nextPow2(this.players.length))} get champion(){const f=this.matches.find(m=>m.round===this.finalRound);return f?this.winner(f):undefined} back(){this.started=false;this.organizerTab='roster';this.closeBattle();this.save();this.cdr.detectChanges()}
 returnToRoster():void{this.back()}
 async deleteSavedSchedule(eventId:string):Promise<void>{
   if(this.eventBusy||this.eventSelectBusy||!this.canManageEvents)return;
   const event=eventId==='main'?null:this.cloudEvents.find(e=>e.id===eventId);
   const name=event?.title??'測試名單 main';
   if(!confirm('確定刪除「'+name+'」的對戰賽程與所有比分？\\n報名名單及賽事活動會保留，此操作無法復原。'))return;
   this.eventBusy=true;
   try{
     if(eventId!=='main')await this.cloudRegistration.deleteSchedule(eventId);
     localStorage.removeItem(this.eventScheduleKey(eventId));
     if(eventId==='main')localStorage.removeItem(this.storageKey);
     if(this.eventId===eventId){
       this.closeBattle();this.started=false;this.players=[];this.matches=[];this.knockoutView='matches';
       if(eventId==='main'){this.names=Array.from({length:this.count},()=> '');}
     }
     this.savedScheduleEventIds=this.savedScheduleEventIds.filter(id=>id!==eventId);
     this.registrationMessage='已刪除「'+name+'」的對戰賽程，報名名單已保留';
   }catch(error){this.registrationMessage='刪除賽程失敗：'+String(error)}
   finally{this.eventBusy=false;this.cdr.detectChanges()}
 }
 async openSavedSchedule(eventId:string):Promise<void>{
   if(this.eventSelectBusy||this.eventBusy)return;
   if(this.eventId!==eventId)await this.selectCloudEvent(eventId);
   if(this.eventId!==eventId)return;
   if(!this.matches.length){this.registrationMessage='這場比賽尚未建立對戰賽程';return}
   this.resumeSchedule();
 }
 resumeSchedule():void{if(!this.matches.length)return;this.started=true;this.organizerTab='schedule';this.save();this.cdr.detectChanges()} clear(){if(confirm('確定清除目前比賽紀錄？')){localStorage.removeItem(this.storageKey);location.reload()}} private save(){this.persistCurrentEventSchedule();if(this.eventId==='main')localStorage.setItem(this.storageKey,JSON.stringify({title:this.title,count:this.count,mode:this.mode,knockoutView:this.knockoutView,names:this.names,players:this.players,matches:this.matches,started:this.started}));this.publishPublicSchedule()} private restore(){try{const d=JSON.parse(localStorage.getItem(this.storageKey)||'null');if(!d)return;Object.assign(this,d);this.knockoutView=d.knockoutView??'matches'}catch{}}
 showBattleInfoDialog(){const dialog=document.createElement('dialog');dialog.className='battle-info-dialog';const title=document.createElement('h2');title.textContent=this.mode==='league'?'目前積分排名':'目前晉級賽戰況';const body=document.createElement('div');if(this.mode==='league'){const table=document.createElement('table');table.innerHTML='<thead><tr><th>#</th><th>選手</th><th>勝</th><th>敗</th><th>得分</th></tr></thead>';const tbody=document.createElement('tbody');this.standings.forEach((s,i)=>{const row=document.createElement('tr');row.innerHTML=`<td>${i+1}</td><td>${s.name}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.scored}</td>`;tbody.appendChild(row)});table.appendChild(tbody);body.appendChild(table)}else{this.rounds.forEach(round=>{const heading=document.createElement('h3');heading.textContent=round===this.finalRound?'冠軍戰':`第 ${round} 輪`;body.appendChild(heading);this.roundMatches(round).filter(m=>m.a&&m.b).forEach(m=>{const item=document.createElement('p');item.textContent=`${m.a}  ${m.sa??0} : ${m.sb??0}  ${m.b}`;body.appendChild(item)})})}const close=document.createElement('button');close.textContent='關閉';close.onclick=()=>dialog.close();dialog.append(title,body,close);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.appendChild(dialog);dialog.showModal()}
 openRecordingMode(){if(!this.battleMatch||this.recordingModeOpen)return;this.recordingModeOpen=true;const overlay=document.createElement('div');overlay.className='recording-mode-overlay';overlay.innerHTML='<video class="recording-preview" autoplay muted playsinline></video><div class="recording-topbar"><strong>錄影模式</strong><button class="recording-close">×</button></div><div class="recording-scoreboard"><div class="recording-player recording-player-a"><strong class="recording-name-a"></strong><div class="recording-finish-row"><button data-finish="a:spin">+1</button><button data-finish="a:over">+2</button><button data-finish="a:xtreme">+3</button></div><button class="recording-fail" data-fail="a"><span>發射失敗</span><i></i><i></i></button></div><div class="recording-center"><div class="recording-score"><b data-score="a">0</b><span>:</span><b data-score="b">0</b></div><button class="recording-go-btn">📹 3・2・1 GO SHOOT!</button></div><div class="recording-player recording-player-b"><strong class="recording-name-b"></strong><div class="recording-finish-row"><button data-finish="b:spin">+1</button><button data-finish="b:over">+2</button><button data-finish="b:xtreme">+3</button></div><button class="recording-fail" data-fail="b"><span>發射失敗</span><i></i><i></i></button></div></div>';document.body.appendChild(overlay);this.recordingOverlay=overlay;const video=overlay.querySelector<HTMLVideoElement>('.recording-preview');if(video)this.cameraStream&&((video.srcObject=this.cameraStream),video.play().catch(()=>{}));overlay.querySelector('.recording-name-a')!.textContent=this.battleMatch.a??'';overlay.querySelector('.recording-name-b')!.textContent=this.battleMatch.b??'';overlay.querySelector('.recording-go-btn')?.addEventListener('click',()=>this.playCountdown());overlay.querySelector('.recording-close')?.addEventListener('click',()=>this.closeRecordingMode());overlay.querySelectorAll<HTMLButtonElement>('[data-finish]').forEach(button=>button.addEventListener('click',()=>{const [side,type]=button.dataset.finish!.split(':') as ['a'|'b',FinishType];this.addBattleScore(side,type);this.refreshRecordingScoreboard()}));overlay.querySelectorAll<HTMLButtonElement>('[data-fail]').forEach(button=>button.addEventListener('click',()=>{this.launchFail(button.dataset.fail as 'a'|'b');this.refreshRecordingScoreboard()}));this.refreshRecordingScoreboard();void this.ensureCamera().then(()=>{if(video&&this.cameraStream){video.srcObject=this.cameraStream;video.play().catch(()=>{})}})} closeRecordingMode(){this.stopRecording();this.stopCamera();this.recordingModeOpen=false;this.recordingOverlay?.remove();this.recordingOverlay=undefined} refreshRecordingScoreboard(){if(!this.recordingOverlay||!this.battleMatch)return;this.recordingOverlay.querySelector('[data-score="a"]')!.textContent=String(this.battlePoints('a'));this.recordingOverlay.querySelector('[data-score="b"]')!.textContent=String(this.battlePoints('b'));(['a','b'] as const).forEach(side=>{this.recordingOverlay?.querySelectorAll<HTMLButtonElement>(`[data-fail="${side}"] i`).forEach((light,index)=>light.classList.toggle('active',this.launchFails[side]>index))});const button=this.recordingOverlay.querySelector<HTMLElement>('.recording-go-btn');if(button)button.textContent=this.recording?this.recordingPaused?'▶ 繼續錄影':'⏸ 暫停':'📹 3・2・1 GO SHOOT!'}
}
