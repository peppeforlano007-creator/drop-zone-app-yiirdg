import { test, expect } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { BOOKING_FLOW, reconcileCardAttempt, verifyCardSettlement, StripeTestCardGateway } from '../supabase/functions/_shared/booking-card-flow.ts';
const now=1800000000, iso=n=>new Date(n*1000).toISOString();
const clone=x=>structuredClone(x);
function fixture() {
  let a={id:randomUUID(),user_id:randomUUID(),drop_id:randomUUID(),product_id:randomUUID(),variant_id:null,
    pickup_point_id:randomUUID(),original_cents:10000,group_bps:2000,authorized_cents:8000,
    drop_end:iso(now+5*86400),created_at:iso(now),expires_at:iso(now+600),target_booking_id:randomUUID(),
    intent_id:null,booking_id:null,state:'creating',capture_before:null,final_cents:null,final_group_bps:null,
    final_loyalty_bps:null,frozen_at:null,release_reason:null};
  let pi={id:'pi_onlySynthetic',object:'payment_intent',livemode:false,currency:'eur',capture_method:'manual',
    amount:8000,amount_capturable:0,amount_received:0,status:'requires_payment_method',
    metadata:{flow:BOOKING_FLOW,booking_attempt_id:a.id,user_id:a.user_id,drop_id:a.drop_id,product_id:a.product_id,variant_id:'none'},latest_charge:null};
  const f={inserts:0,stock:2,value:0,captures:0,cancels:0,creates:0,closed:false,notes:[],insertFails:false,writeLost:null,
    get a(){return a;},get pi(){return pi;},
    authorize(){ pi.status='requires_capture';pi.amount_capturable=8000;pi.latest_charge={captured:false,refunded:false,amount_refunded:0,amount_captured:0,payment_method_details:{type:'card',card:{capture_before:now+7*86400}}}; },
  };
  f.store={
    async get(){return clone(a);},
    async attach(id,intent){if(a.intent_id&&a.intent_id!==intent)throw Error('INTENT_IMMUTABLE');a.intent_id=intent;if(a.state==='creating')a.state='awaiting_authorization';return clone(a);},
    async finalize(input,before){if(a.state==='awaiting_authorization'){
      if(f.insertFails){a.state='release_pending';a.release_reason='BOOKING_REJECTED';}
      else {a.state='booked';a.capture_before=iso(before);a.booking_id=a.target_booking_id;f.inserts++;f.stock--;f.value+=80;}
    } if(f.writeLost==='finalize'){f.writeLost=null;throw Error('CARD_DATABASE_RETRY_REQUIRED');}return clone(a);},
    async prepare(){if(a.state==='booked'&&f.closed){a.state='capture_pending';a.final_cents=6000;a.final_group_bps=4000;a.final_loyalty_bps=0;a.frozen_at=iso(now+5*86400+1);}return clone(a);},
    async release(id,reason){if(['creating','awaiting_authorization','booked'].includes(a.state)){a.state='release_pending';a.release_reason=reason;}return clone(a);},
    async record(input,result,received){
      if(!['captured','released'].includes(a.state)){
        a.state=result;
        if(result==='released'&&a.booking_id&&a.final_cents!==0){f.stock++;f.value=0;}
      }
      if(f.writeLost==='record'){f.writeLost=null;throw Error('CARD_DATABASE_RETRY_REQUIRED');}return clone(a);
    },
    async note(id,code,review){f.notes.push(code);if(review&&!['captured','released'].includes(a.state))a.state='review';},
  };
  f.gateway={
    async create(){f.creates++;return clone(pi);},async retrieve(){return clone(pi);},
    async capture(){f.captures++;pi.status='succeeded';pi.amount_received=a.final_cents;pi.amount_capturable=0;
      pi.latest_charge.captured=true;pi.latest_charge.amount_captured=a.final_cents;pi.latest_charge.amount_refunded=8000-a.final_cents;
      if(f.writeLost==='capture'){f.writeLost=null;throw Error('STRIPE_WRITE_UNCONFIRMED');}},
    async cancel(){f.cancels++;pi.status='canceled';pi.amount_capturable=0;if(pi.latest_charge)pi.latest_charge.amount_refunded=8000;},
  };
  f.run=t=>reconcileCardAttempt(a.id,f.store,f.gateway,t??now);
  return f;
}
async function booked(){const f=fixture();await f.run();f.authorize();await f.run();return f;}

test('opening, abandoning or declining checkout never reserves inventory',async()=>{
  const f=fixture();await f.run();expect(f.a.state).toBe('awaiting_authorization');expect(f.inserts).toBe(0);expect(f.stock).toBe(2);expect(f.value).toBe(0);
  await f.run(now+601);expect(f.a.state).toBe('released');expect(f.cancels).toBe(1);expect(f.inserts).toBe(0);
});
test('confirmed authorization books once, then lower closing capture releases remainder',async()=>{
  const f=await booked();expect(f.stock).toBe(1);expect(f.value).toBe(80);expect(f.captures).toBe(0);
  await Promise.all([f.run(),f.run(),f.run()]);expect(f.inserts).toBe(1);expect(f.stock).toBe(1);expect(f.value).toBe(80);
  f.closed=true;await f.run(now+5*86400+1);await f.run(now+5*86400+2);
  expect(f.a.state).toBe('captured');expect(f.pi.amount_received).toBe(6000);expect(f.pi.amount_capturable).toBe(0);expect(f.captures).toBe(1);expect(f.stock).toBe(1);
});
test('lost response after committed booking cannot double decrement',async()=>{
  const f=fixture();await f.run();f.authorize();f.writeLost='finalize';await expect(f.run()).rejects.toThrow('DATABASE_RETRY');await f.run();expect(f.inserts).toBe(1);expect(f.stock).toBe(1);
});
test('Stripe captured but response lost: next GET records success without second capture',async()=>{
  const f=await booked();f.closed=true;f.writeLost='capture';await expect(f.run()).rejects.toThrow('WRITE_UNCONFIRMED');expect(f.a.state).toBe('capture_pending');
  await f.run();expect(f.a.state).toBe('captured');expect(f.captures).toBe(1);
});
test('lost DB acknowledgement after paid result cannot recapture',async()=>{
  const f=await booked();f.closed=true;f.writeLost='record';await expect(f.run()).rejects.toThrow('DATABASE_RETRY');await f.run();expect(f.captures).toBe(1);expect(f.a.state).toBe('captured');
});
test('sold-out between checkout and authorization cancels only own hold',async()=>{
  const f=fixture();await f.run();f.authorize();f.insertFails=true;await f.run();expect(f.a.state).toBe('released');expect(f.cancels).toBe(1);expect(f.inserts).toBe(0);expect(f.stock).toBe(2);
});
test('short network authorization window is released, never booked/captured early',async()=>{
  const f=fixture();await f.run();f.authorize();f.pi.latest_charge.payment_method_details.card.capture_before=now+2*86400;
  await f.run();expect(f.a.state).toBe('released');expect(f.inserts).toBe(0);expect(f.captures).toBe(0);
});
test('closing unavailable near expiry releases instead of charging wrong price',async()=>{
  const f=await booked();await f.run(now+7*86400-100);expect(f.a.state).toBe('released');expect(f.captures).toBe(0);expect(f.stock).toBe(2);
});
test('expired authorization in frozen capture waits for verified Stripe cancellation',async()=>{
  const f=await booked();f.closed=true;await expect(f.run(now+8*86400)).rejects.toThrow('AUTHORIZATION_EXPIRED');expect(f.a.state).toBe('capture_pending');expect(f.captures).toBe(0);expect(f.stock).toBe(1);
  f.pi.status='canceled';f.pi.amount_capturable=0;await f.run(now+8*86400);expect(f.a.state).toBe('released');expect(f.stock).toBe(2);
});
test('late authorization after checkout expiry is canceled without booking',async()=>{
  const f=fixture();await f.run();f.authorize();await f.run(now+601);expect(f.a.state).toBe('released');expect(f.inserts).toBe(0);
});
test('zero final price cancels hold without canceling the free booking',async()=>{
  const f=await booked();f.a.state='release_pending';f.a.final_cents=0;f.a.final_group_bps=10000;f.a.final_loyalty_bps=0;f.a.frozen_at=iso(now);await f.run();expect(f.captures).toBe(0);expect(f.cancels).toBe(1);expect(f.stock).toBe(1);
});
for(const field of ['flow','user_id','drop_id','product_id','variant_id','booking_attempt_id'])test(`mismatched ${field} never books or cancels a foreign intent`,async()=>{
  const f=fixture();await f.run();f.authorize();f.pi.metadata[field]='other';await expect(f.run()).rejects.toThrow('IDENTITY_MISMATCH');expect(f.a.state).toBe('review');expect(f.inserts).toBe(0);expect(f.cancels).toBe(0);
});
test('live intent is rejected before booking, capture or cancellation',async()=>{
  const f=fixture();await f.run();f.authorize();f.pi.livemode=true;await expect(f.run()).rejects.toThrow('LIVE_PAYMENTS_DISABLED');expect(f.cancels).toBe(0);expect(f.inserts).toBe(0);
});
test('creation older than idempotency retention is never blindly reissued',async()=>{
  const f=fixture();await expect(f.run(now+24*3600)).rejects.toThrow('UNRESOLVED_OLD_CREATION');expect(f.creates).toBe(0);expect(f.a.state).toBe('review');
});
test('unrelated capture before a frozen price is not a successful booking',async()=>{
  const f=fixture();await f.run();f.pi.status='succeeded';await expect(f.run()).rejects.toThrow('UNEXPECTED_CAPTURE');expect(f.inserts).toBe(0);
});
test('additional refund, wrong capture and over-authorization plan never become paid',async()=>{
  const f=await booked();f.closed=true;await f.run();const a=clone(f.a),pi=clone(f.pi);
  pi.latest_charge.amount_refunded++;expect(()=>verifyCardSettlement(pi,a)).toThrow('CAPTURE_NOT_VERIFIED');
  pi.latest_charge.amount_refunded--;pi.amount_received--;expect(()=>verifyCardSettlement(pi,a)).toThrow('CAPTURE_NOT_VERIFIED');
  a.final_cents=8001;expect(()=>verifyCardSettlement(f.pi,a)).toThrow('CAPTURE_NOT_VERIFIED');
});
test('gateway retries ambiguous creation with identical body/key, no client confirmation or saved card',async()=>{
  const f=fixture();let calls=[];
  const gateway=new StripeTestCardGateway('sk_test_fixture',async(url,options)=>{
    calls.push({url,options});if(calls.length===1)throw Error('network');return Response.json({...f.pi,client_secret:'never_log'});
  });
  await gateway.create(f.a);expect(calls).toHaveLength(2);expect(calls[0].options.body).toBe(calls[1].options.body);
  expect(calls[0].options.headers['Idempotency-Key']).toBe(calls[1].options.headers['Idempotency-Key']);
  const body=new URLSearchParams(calls[0].options.body);expect(body.get('capture_method')).toBe('manual');expect(body.has('confirm')).toBe(false);expect(body.has('setup_future_usage')).toBe(false);expect(body.has('payment_method')).toBe(false);
  expect(calls[0].options.redirect).toBe('error');expect(calls[0].options.headers['Stripe-Version']).toBe('2024-06-20');
});
test('gateway never accepts a live/publishable/missing key',()=>{
  for(const key of [undefined,'sk_live_fake','pk_test_fake',' sk_test_fake'])expect(()=>new StripeTestCardGateway(key)).toThrow('TEST_KEY_REQUIRED');
});
test('gateway capture uses one immutable lower amount, no rejected optional final_capture',async()=>{
  const f=await booked();f.closed=true;await f.store.prepare();let options;
  const gateway=new StripeTestCardGateway('sk_test_fixture',async(url,o)=>{options=o;expect(url).toMatch(/\/payment_intents\/pi_onlySynthetic\/capture$/);return Response.json(f.pi);});
  await gateway.capture(f.a);expect(new URLSearchParams(options.body).get('amount_to_capture')).toBe('6000');expect(new URLSearchParams(options.body).has('final_capture')).toBe(false);
  f.a.final_cents=8001;await expect(gateway.capture(f.a)).rejects.toThrow('CAPTURE_PLAN_INVALID');
});
