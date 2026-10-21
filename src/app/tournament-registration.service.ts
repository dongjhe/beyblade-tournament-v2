import { Injectable, NgZone } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, EmailAuthProvider, linkWithCredential, User } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, query, where, serverTimestamp, setDoc, updateDoc, runTransaction, Unsubscribe } from 'firebase/firestore';

export interface CloudRegistration { uid: string; name: string; ownerUid: string; }
export interface CloudEvent { id:string; title:string; mode:'league'|'knockout'; open:boolean; date:string; location:string; fee:number; notes:string; capacity:number; }
const app = initializeApp({
  apiKey: 'AIzaSyAPWrWFXHPyIWaS7xw7thwVwtgi4rZ4xTs',
  authDomain: 'beyblade-tournament-eeb50.firebaseapp.com',
  projectId: 'beyblade-tournament-eeb50',
  storageBucket: 'beyblade-tournament-eeb50.firebasestorage.app',
  messagingSenderId: '671576185411',
  appId: '1:671576185411:web:2113f70893c6db9c3792f6'
});
const auth = getAuth(app);
const db = getFirestore(app);
// First cloud MVP uses one shared registration event. Multi-event support comes next.


@Injectable({ providedIn: 'root' })
export class TournamentRegistrationService {
  private unsubscribe?: Unsubscribe;
  private scheduleUnsubscribe?: Unsubscribe;
  private verifiedScheduleOwnerEventId: string | null = null;
  private eventId = 'main';
  onAuthChanged(callback:(user:User|null)=>void):Unsubscribe{return onAuthStateChanged(auth,callback);}
  get signedInUser():User|null{return auth.currentUser;}
  async waitForAuth():Promise<void>{await auth.authStateReady();}
  get isStaffSignedIn():boolean{return !!auth.currentUser && !auth.currentUser.isAnonymous;}
  async ensureParticipantAuth():Promise<void>{await auth.authStateReady();if(!auth.currentUser)await this.ensureParticipantAuth();}
  async signInStaff(email:string,password:string):Promise<void>{await signInWithEmailAndPassword(auth,email.trim(),password);}
  async signUpStaff(email:string,password:string):Promise<void>{
    await auth.authStateReady();
    const previous=auth.currentUser;
    if(previous?.isAnonymous){
      const credential=EmailAuthProvider.credential(email.trim(),password);
      await linkWithCredential(previous,credential);
    }else{
      await createUserWithEmailAndPassword(auth,email.trim(),password);
    }
    await this.ensureStaffProfile();
  }
  async signOutStaff():Promise<void>{await signOut(auth);}
  async ensureStaffProfile():Promise<void>{
    const user=auth.currentUser;if(!user||user.isAnonymous)return;
    const ref=doc(db,'staff',user.uid),snap=await getDoc(ref);
    if(!snap.exists())await setDoc(ref,{email:user.email??'',role:'member',createdAt:serverTimestamp()});
  }
  async getStaffRole():Promise<'admin'|'judge'|'member'|'pending'|'none'>{
    const user=auth.currentUser;if(!user||user.isAnonymous)return 'none';
    const snap=await getDoc(doc(db,'staff',user.uid));
    const role=snap.data()?.['role'];
    return role==='admin'||role==='judge'||role==='member'?role:'pending';
  }
  async listStaff():Promise<{uid:string;email:string;role:string;assignedEventIds:string[]}[]>{
    const user=auth.currentUser;if(!user||user.isAnonymous)return [];
    const snapshot=await getDocs(collection(db,'staff'));
    return snapshot.docs.map(d=>({uid:d.id,email:String(d.data()['email']??''),role:String(d.data()['role']??'pending'),assignedEventIds:Array.isArray(d.data()['assignedEventIds'])?d.data()['assignedEventIds']:[]}));
  }
  async getAssignedJudgeEventIds():Promise<string[]> {
    const user=auth.currentUser;
    if(!user || user.isAnonymous)return [];
    const snap=await getDoc(doc(db,'staff',user.uid));
    return snap.data()?.['role']==='judge' && Array.isArray(snap.data()?.['assignedEventIds']) ? snap.data()!['assignedEventIds'] : [];
  }
  async setJudgeEventAssignments(uid:string,eventIds:string[]):Promise<void>{
    await updateDoc(doc(db,'staff',uid),{assignedEventIds:[...new Set(eventIds)]});
  }
  async setStaffRole(uid:string,role:'judge'|'member'):Promise<void>{
    await updateDoc(doc(db,'staff',uid),{role});
  }

  get currentEventId(): string { return this.eventId; }
  get currentUserId(): string | null { return auth.currentUser?.uid ?? null; }
  async listPublicEvents():Promise<CloudEvent[]> {
    await this.ensureParticipantAuth();
    const snapshot=await getDocs(collection(db,'events'));
    return snapshot.docs.filter(item=>item.data()['deleted']!==true).map(item=>({
      id:item.id,title:String(item.data()['title']??''),
      mode:item.data()['mode']==='knockout'?'knockout' as const:'league' as const,
      open:item.data()['open']===true,date:String(item.data()['date']??''),
      location:String(item.data()['location']??''),fee:Number(item.data()['fee']??0),notes:String(item.data()['notes']??''),capacity:Number(item.data()['capacity']??64)
    })).sort((a,b)=>a.date.localeCompare(b.date));
  }
  async listMyRegistrationHistory():Promise<{event:CloudEvent;players:string[];wins:number;losses:number;scored:number}[]>{
    await this.ensureParticipantAuth();
    const uid=auth.currentUser?.uid;
    if(!uid)return [];
    const events=await this.listPublicEvents();
    const results=await Promise.all(events.map(async event=>{
      try{
        const snapshot=await getDocs(query(collection(db,'events',event.id,'registrations'),where('uid','==',uid)));
        if(snapshot.empty)return null;
        const players=snapshot.docs.map(item=>String(item.data()['name']??'')).filter(Boolean);
        let wins=0,losses=0,scored=0;
        const schedule=await getDoc(doc(db,'events',event.id,'public','schedule'));
        const matches=(schedule.data()?.['matches']??[]) as {a?:string|null;b?:string|null;sa?:number|null;sb?:number|null}[];
        for(const match of matches){
          if(!match['a']||!match['b']||match.sa==null||match.sb==null||Math.max(match.sa,match.sb)<4)continue;
          const side=players.includes(match.a)?'a':players.includes(match.b)?'b':null;
          if(!side)continue;
          const mine=side==='a'?match.sa:match.sb,other=side==='a'?match.sb:match.sa;
          scored+=mine;
          if(mine>other)wins++;else if(mine<other)losses++;
        }
        return {event,players,wins,losses,scored};
      }catch{return null}
    }));
    return results.filter((item):item is NonNullable<typeof item>=>item!==null);
  }
  async listOwnedEvents():Promise<CloudEvent[]> {
    const user=auth.currentUser;
    if(!user||user.isAnonymous)return [];
    const snapshot=await getDocs(query(collection(db,'events'),where('ownerUid','==',user.uid)));
    return snapshot.docs.filter(item=>item.data()['deleted']!==true).map(item=>({id:item.id,title:String(item.data()['title']??''),mode:item.data()['mode']==='knockout'?'knockout' as const:'league' as const,open:item.data()['open']===true,date:String(item.data()['date']??''),location:String(item.data()['location']??''),fee:Number(item.data()['fee']??0),notes:String(item.data()['notes']??''),capacity:Number(item.data()['capacity']??64)})).sort((a,b)=>a.title.localeCompare(b.title,'zh-Hant'));
  }
  async createEvent(title: string, mode: 'league' | 'knockout', date:string, location:string,fee:number,notes:string,capacity:number): Promise<string> {
    const user = auth.currentUser;
    if(!user||user.isAnonymous)throw new Error('請先以管理者帳號登入');
    const eventRef = doc(collection(db, 'events'));
    await setDoc(eventRef, { title, mode, date, location, fee, notes, capacity, registrationCount:0, ownerUid: user.uid, open: true, deleted:false, createdAt: serverTimestamp() });
    return eventRef.id;
  }
  async loadEvent(eventId: string): Promise<{title:string;mode:'league'|'knockout';open:boolean;ownerUid:string;date:string;location:string;fee:number;notes:string;capacity:number}> {
    if(!auth.currentUser)await signInAnonymously(auth);
    const snap = await getDoc(doc(db, 'events', eventId));
    if (!snap.exists() || snap.data()['deleted']===true) throw new Error('找不到賽事或賽事已刪除');
    const data = snap.data();
    return {title:String(data['title']),mode:data['mode']==='knockout'?'knockout':'league',open:data['open']===true,ownerUid:String(data['ownerUid']),date:String(data['date']??''),location:String(data['location']??''),fee:Number(data['fee']??0),notes:String(data['notes']??''),capacity:Number(data['capacity']??64)};
  }
  async setRegistrationOpen(open:boolean):Promise<void> {
    const user=auth.currentUser;
    if(!user)throw new Error('請先完成匿名驗證');
    const ref=doc(db,'events',this.eventId);
    const snap=await getDoc(ref);
    if(!snap.exists()||snap.data()['ownerUid']!==user.uid)throw new Error('只有建立賽事的裝置可以管理報名');
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(ref,{open});
  }
  async deleteEvent(eventId:string):Promise<void>{
    const user=auth.currentUser;
    if(!user)throw new Error('請先完成匿名驗證');
    const ref=doc(db,'events',eventId);
    const snapshot=await getDoc(ref);
    if(!snapshot.exists()||snapshot.data()['ownerUid']!==user.uid)throw new Error('只有賽事建立者可以刪除');
    await updateDoc(ref,{deleted:true,open:false});
  }
  async useEvent(eventId:string):Promise<void>{this.unsubscribe?.();this.unsubscribe=undefined;this.scheduleUnsubscribe?.();this.scheduleUnsubscribe=undefined;this.eventId=eventId;this.verifiedScheduleOwnerEventId=null;}

  async publishSchedule(payload:{mode:'league'|'knockout';players:string[];matches:{id:number;round:number;a:string|null;b:string|null;sa:number|null;sb:number|null;battleRound?:number}[]}):Promise<void>{
    const user=auth.currentUser;
    if(!user||this.eventId==='main')throw new Error('請先選擇有效賽事');
    const eventId=this.eventId;
    if(this.verifiedScheduleOwnerEventId!==eventId){
      const event=await getDoc(doc(db,'events',eventId));
      if(!event.exists()||event.data()['ownerUid']!==user.uid||event.data()['deleted']===true)throw new Error('只有賽事主辦方可以發布賽程');
      this.verifiedScheduleOwnerEventId=eventId;
    }
    await setDoc(doc(db,'events',eventId,'public','schedule'),{...payload,updatedAt:serverTimestamp()});
  }
  async claimJudgeMatch(eventId:string,matchId:number):Promise<void>{
    const user=auth.currentUser;if(!user||user.isAnonymous)throw new Error('請先以裁判帳號登入');
    const lock=doc(db,'events',eventId,'matchLocks',String(matchId));
    await runTransaction(db,async tx=>{
      const snap=await tx.get(lock);const data=snap.data();const now=Date.now();
      if(data&&data['uid']!==user.uid&&Number(data['expiresAt'])>now)throw new Error('此場次已有其他裁判進行對戰');
      tx.set(lock,{uid:user.uid,matchId,expiresAt:now+120000,updatedAt:serverTimestamp()});
    });
  }
  async releaseJudgeMatch(eventId:string,matchId:number):Promise<void>{
    const user=auth.currentUser;if(!user)return;
    const lock=doc(db,'events',eventId,'matchLocks',String(matchId));
    await runTransaction(db,async tx=>{const snap=await tx.get(lock);if(snap.data()?.['uid']===user.uid)tx.delete(lock)});
  }
  watchJudgeLocks(eventId:string,onData:(locks:Record<string,{uid:string;expiresAt:number}>)=>void):Unsubscribe{
    return onSnapshot(collection(db,'events',eventId,'matchLocks'),snapshot=>{
      const locks:Record<string,{uid:string;expiresAt:number}>={};
      snapshot.forEach(item=>{const data=item.data();locks[item.id]={uid:String(data['uid']??''),expiresAt:Number(data['expiresAt']??0)}});
      this.zone.run(()=>onData(locks));
    });
  }
  async scoreJudgeMatch(eventId:string,matchId:number,side:'a'|'b',points:number,reset=false):Promise<void>{
    const user=auth.currentUser;if(!user||user.isAnonymous)throw new Error('請先登入裁判帳號');
    const lock=doc(db,'events',eventId,'matchLocks',String(matchId));
    const schedule=doc(db,'events',eventId,'public','schedule');
    await runTransaction(db,async tx=>{
      const lockSnap=await tx.get(lock);const scheduleSnap=await tx.get(schedule);
      if(!lockSnap.exists()||lockSnap.data()['uid']!==user.uid||Number(lockSnap.data()['expiresAt'])<=Date.now())throw new Error('場次鎖定已失效，請重新進入對戰');
      if(!scheduleSnap.exists())throw new Error('主辦方尚未發布賽程');
      const data=scheduleSnap.data();const matches=Array.isArray(data['matches'])?data['matches'].map((m:Record<string,unknown>)=>({...m})):[];
      const index=matches.findIndex((m:Record<string,unknown>)=>m['id']===matchId);if(index<0)throw new Error('找不到指定對戰');
      const match=matches[index];if(!match['a']||!match['b'])throw new Error('此場次尚未確認選手');
      
      const score=side==='a'?'sa':'sb';if(reset){match['sa']=0;match['sb']=0}else{match[score]=Number(match[score]??0)+points; if(match['sa']===null)match['sa']=0;if(match['sb']===null)match['sb']=0;}
      tx.update(schedule,{matches,lastJudgeMatchId:matchId,lastJudgeUid:user.uid,updatedAt:serverTimestamp()});
      tx.update(lock,{expiresAt:Date.now()+120000,updatedAt:serverTimestamp()});
    });
  }
  async deleteSchedule(eventId:string):Promise<void>{
    const user=auth.currentUser;
    if(!user||eventId==='main')throw new Error('請先選擇有效賽事');
    const event=await getDoc(doc(db,'events',eventId));
    if(!event.exists()||event.data()['ownerUid']!==user.uid)throw new Error('只有賽事建立者可以刪除賽程');
    await deleteDoc(doc(db,'events',eventId,'public','schedule'));
  }
  async readSchedule(eventId:string):Promise<{mode:'league'|'knockout';players:string[];matches:{id:number;round:number;a:string|null;b:string|null;sa:number|null;sb:number|null;battleRound?:number}[]}|null>{
    const snapshot=await getDoc(doc(db,'events',eventId,'public','schedule'));
    if(!snapshot.exists())return null;
    const data=snapshot.data();
    return {mode:data['mode']==='knockout'?'knockout':'league',players:Array.isArray(data['players'])?data['players']:[],matches:Array.isArray(data['matches'])?data['matches']:[]};
  }
  async watchSchedule(onData:(data:{mode:'league'|'knockout';players:string[];matches:{id:number;round:number;a:string|null;b:string|null;sa:number|null;sb:number|null;battleRound?:number}[]}|null)=>void,onError:(message:string)=>void):Promise<void>{
    if(!auth.currentUser)await signInAnonymously(auth);
    this.scheduleUnsubscribe?.();
    this.scheduleUnsubscribe=onSnapshot(doc(db,'events',this.eventId,'public','schedule'),snap=>{
      const data=snap.data();
      this.zone.run(()=>onData(data?{mode:data['mode']==='knockout'?'knockout':'league',players:Array.isArray(data['players'])?data['players']:[],matches:Array.isArray(data['matches'])?data['matches']:[]}:null));
    },error=>this.zone.run(()=>onError(error.message)));
  }
  constructor(private zone: NgZone) {}
  async connect(onNames: (names: CloudRegistration[]) => void, onError: (error: string) => void): Promise<void> {
    try {
      if(!auth.currentUser)await signInAnonymously(auth);
      this.unsubscribe?.();
      this.unsubscribe = onSnapshot(collection(db, 'events', this.eventId, 'registrations'), snapshot => {
        const names = snapshot.docs.map(d => ({ uid: d.id, name: String(d.data()['name'] ?? ''), ownerUid: String(d.data()['uid'] ?? '') }))
          .filter(item => item.name.length > 0).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        this.zone.run(() => onNames(names));
      }, error => this.zone.run(() => onError(error.message)));
    } catch (error) {
      this.zone.run(() => onError(error instanceof Error ? error.message : String(error)));
    }
  }
  async renameRegistration(registrationId:string,name:string):Promise<void>{
    if(await this.getStaffRole()!=='admin')throw new Error('只有管理者可以編輯報名名單');
    await updateDoc(doc(db,'events',this.eventId,'registrations',registrationId),{name});
  }
  async deleteRegistration(registrationId:string):Promise<void>{
    if(await this.getStaffRole()!=='admin')throw new Error('只有管理者可以刪除報名名單');
    const eventRef=doc(db,'events',this.eventId);const regRef=doc(db,'events',this.eventId,'registrations',registrationId);
    await runTransaction(db,async tx=>{const event=await tx.get(eventRef);const reg=await tx.get(regRef);if(!reg.exists())return;tx.delete(regRef);if(event.exists()&&event.data()['registrationCount']!==undefined)tx.update(eventRef,{registrationCount:Math.max(0,Number(event.data()['registrationCount'])-1)});});
  }
  async cancelMyRegistration(registrationId:string):Promise<void>{
    const user=auth.currentUser;if(!user)throw new Error('請先登入');
    const event=await getDoc(doc(db,'events',this.eventId));
    if(!event.exists()||event.data()?.['open']!==true||event.data()?.['deleted']===true)throw new Error('報名已截止，無法取消');
    const ref=doc(db,'events',this.eventId,'registrations',registrationId);
    const registration=await getDoc(ref);
    if(!registration.exists()||registration.data()?.['uid']!==user.uid)throw new Error('只能取消自己的報名');
    const eventRef=doc(db,'events',this.eventId);
    await runTransaction(db,async tx=>{
      const event=await tx.get(eventRef);const record=await tx.get(ref);
      if(!event.exists()||event.data()['open']!==true||event.data()['deleted']===true)throw new Error('報名已截止');
      if(!record.exists()||record.data()['uid']!==user.uid)throw new Error('只能取消自己的報名');
      tx.delete(ref);
      if(event.data()['registrationCount']!==undefined)tx.update(eventRef,{registrationCount:Math.max(0,Number(event.data()['registrationCount'])-1)});
    });
  }
  async register(name: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('匿名登入尚未完成');
    const eventRef=doc(db,'events',this.eventId);
    const registrationRef=doc(collection(db,'events',this.eventId,'registrations'));
    await runTransaction(db,async tx=>{
      const event=await tx.get(eventRef);
      if(!event.exists()||event.data()['deleted']===true||event.data()['open']!==true)throw new Error('報名已截止');
      const capacity=Number(event.data()['capacity']??64);
      if(event.data()['registrationCount']===undefined)throw new Error('舊賽事尚未設定人數上限，請聯絡主辦方');
      const count=Number(event.data()['registrationCount']);
      if(count>=capacity)throw new Error('報名已額滿');
      tx.set(registrationRef,{name,uid:user.uid,createdAt:serverTimestamp()});
      tx.update(eventRef,{registrationCount:count+1});
    });
  }
}
